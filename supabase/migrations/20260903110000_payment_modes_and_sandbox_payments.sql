-- Payment modes — the seam a gateway attaches to, sandbox and live.
--
-- ─── Why a separate table and not a `mode` column on finance.payments ──
-- Six triggers fire on `finance.payments`:
--
--   payments_block_delete              a row cannot be deleted
--   payments_block_update              a row cannot be edited
--   payments_generate_receipt          writes finance.receipt_verifications,
--                                      a token finance.verify_receipt validates
--   payments_write_ledger              writes finance.ledger_entries, which
--                                      moves finance.treasury_balances
--   payments_recompute_obligation_status
--   payments_inherit_group_id
--
-- So one test settlement landing there mints a verifiable receipt for money
-- nobody collected, moves the treasury, and CANNOT BE REMOVED. A `mode`
-- column would push the burden onto every dashboard query, report, trigger
-- and policy to remember to filter — and the first one that forgets is
-- permanent. That is the same shape as SEC-01 (an anon RPC that minted
-- settled payments) and SEC-10 (a client-side filter standing in for a
-- policy). Separation is the only version that cannot be forgotten.
--
-- `finance.payment_intents` is the opposite case: no triggers, no cascade,
-- and nothing under `apps/` reads it — only Edge Functions. A mode column
-- there costs nothing and keeps one code path for the staging record.
--
-- ─── The invariant, and how it is held ─────────────────────────────────
-- A sandbox intent must never point at a real payment, and a live intent
-- must never point at a sandbox one. That is not left to the Edge Function
-- to remember: it is a CHECK constraint, so no code path can violate it.

-------------------------------------------------------------------------------
-- 1. The mode
-------------------------------------------------------------------------------

CREATE TYPE finance.payment_mode AS ENUM ('sandbox', 'live');

COMMENT ON TYPE finance.payment_mode IS
  'Which gateway environment produced a record. Always resolved server-side from TRANZAK_MODE — never from a request, because a caller who can choose the mode can pay in sandbox and be recorded as live.';

-------------------------------------------------------------------------------
-- 2. Sandbox settlements
-------------------------------------------------------------------------------
-- Mirrors the useful shape of `finance.payments` and deliberately none of
-- its machinery. No triggers, no ledger, no receipt, no obligation
-- recompute, no treasury. Nothing in the finance dashboards or reports
-- reads this relation, so a row here is inert by construction rather than
-- by remembering to exclude it.
--
-- Unlike `finance.payments` these rows ARE deletable. Test data you cannot
-- clear up stops being test data.

CREATE TABLE finance.sandbox_payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was being paid for. Not foreign-keyed to charges/obligations on
  -- purpose: a sandbox run may target a charge that is later deleted, and
  -- a test settlement must never block a real cleanup.
  intent_id         uuid NOT NULL,
  scope_id          uuid NOT NULL,
  charge_id         uuid,
  obligation_id     uuid,

  -- What we expected.
  amount            numeric(20,4) NOT NULL,
  currency          text NOT NULL,
  method            finance.payment_method NOT NULL,

  -- Who paid. Public AGM payers have no member row, so these mirror the
  -- payer_* columns on payment_intents rather than pointing at core.members.
  payer_member_id   uuid,
  payer_name        text,
  payer_email       text,
  payer_phone       text,

  -- Tranzak issues two identifiers: `requestId` (REQ…) identifies the
  -- payment request we created, `transactionId` (TX…) the settlement that
  -- fulfilled it. Both are kept — the first is what we poll on, the second
  -- is what a Tranzak support ticket will ask for.
  provider              text NOT NULL DEFAULT 'tranzak',
  provider_ref          text,
  provider_transaction_id text,
  provider_status       text,

  -- What the gateway reported, kept separate from the expected `amount`
  -- and `currency` so a mismatch is a visible fact rather than an inferred
  -- one: Fapshi's finalize step inserted our *expected* amount and never
  -- compared it to what settled (SEC-16).
  --
  -- `gateway_amount` is the gross the payer was charged; `gateway_fee` and
  -- `gateway_net_amount` are Tranzak's cut and what actually reaches the
  -- merchant account (`merchant.fee` and `merchant.netAmountReceived` in
  -- the payload). Gross alone would make a run look like it reconciles
  -- when the books would not.
  gateway_amount        numeric(20,4),
  gateway_currency      text,
  gateway_fee           numeric(20,4),
  gateway_net_amount    numeric(20,4),
  raw_payload           jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT sandbox_payments_amount_check   CHECK (amount > 0),
  CONSTRAINT sandbox_payments_gateway_amount_check
    CHECK (gateway_amount IS NULL OR gateway_amount > 0),
  CONSTRAINT sandbox_payments_lengths_bounded CHECK (
    (payer_name     IS NULL OR length(payer_name)     <= 200) AND
    (payer_email    IS NULL OR length(payer_email)    <= 320) AND
    (payer_phone    IS NULL OR length(payer_phone)    <= 80)  AND
    (provider_ref   IS NULL OR length(provider_ref)   <= 200) AND
    (provider_transaction_id IS NULL OR length(provider_transaction_id) <= 200) AND
    (provider_status IS NULL OR length(provider_status) <= 100)
  )
);

COMMENT ON TABLE finance.sandbox_payments IS
  'Settlements from the gateway sandbox. Deliberately carries NONE of finance.payments'' triggers: no ledger entry, no treasury movement, no receipt, no obligation recompute. Nothing in the dashboards or reports reads it. Do not add triggers here, and do not join it into a report — the whole point is that a test settlement cannot reach the books.';

COMMENT ON COLUMN finance.sandbox_payments.gateway_amount IS
  'What the gateway reported settling, kept apart from the expected `amount` so a mismatch is a visible fact rather than a silent one.';

COMMENT ON COLUMN finance.sandbox_payments.provider_ref IS
  'Tranzak requestId (REQ…). Unique per settlement — see sandbox_payments_provider_ref_key, which is what makes a replayed webhook idempotent.';

CREATE INDEX sandbox_payments_intent_idx   ON finance.sandbox_payments (intent_id);
CREATE INDEX sandbox_payments_scope_idx    ON finance.sandbox_payments (scope_id, created_at DESC);
CREATE UNIQUE INDEX sandbox_payments_provider_ref_key
  ON finance.sandbox_payments (provider, provider_ref)
  WHERE provider_ref IS NOT NULL;

COMMENT ON INDEX finance.sandbox_payments_provider_ref_key IS
  'One settlement per gateway transaction. This is what makes a replayed webhook idempotent — the second insert conflicts instead of creating a second payment.';

ALTER TABLE finance.sandbox_payments ENABLE ROW LEVEL SECURITY;

-- Same read gate as finance.payments, so whoever can see real settlements at
-- a scope can see the test ones. No anon: these rows carry payer contact
-- details, and SEC-02 was exactly this table shape left readable.
CREATE POLICY sandbox_payments_select_at_scope ON finance.sandbox_payments
  FOR SELECT TO authenticated
  USING (
    core.has_permission(auth.uid(), scope_id, 'treasury.read')
    OR core.has_permission(auth.uid(), scope_id, 'finance.read')
  );

-- Writes are service_role only — settlement runs in an Edge Function.
GRANT SELECT ON TABLE finance.sandbox_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE finance.sandbox_payments TO service_role;

-------------------------------------------------------------------------------
-- 3. Intents carry the mode
-------------------------------------------------------------------------------
-- Added with a default so the migration applies to a populated database,
-- then the default is dropped: every future insert must state its mode.
-- A forgotten mode should fail loudly, not silently record as live.

ALTER TABLE finance.payment_intents
  ADD COLUMN mode finance.payment_mode NOT NULL DEFAULT 'live',
  ADD COLUMN sandbox_payment_id uuid REFERENCES finance.sandbox_payments(id) ON DELETE SET NULL;

ALTER TABLE finance.payment_intents ALTER COLUMN mode DROP DEFAULT;

COMMENT ON COLUMN finance.payment_intents.mode IS
  'Which gateway environment this intent belongs to. No default: an insert that does not state the mode fails, which is the right outcome — silently defaulting to live is how a sandbox settlement reaches the books.';

CREATE INDEX payment_intents_mode_idx ON finance.payment_intents (mode, status, created_at DESC);

-------------------------------------------------------------------------------
-- 4. The invariant, as a constraint rather than a convention
-------------------------------------------------------------------------------
-- The original constraint said "a succeeded intent has a resulting_payment_id".
-- With two modes that is no longer the whole truth, and the version that
-- replaces it does the real work: a succeeded intent points at exactly one
-- settlement, in the table matching its own mode, and never at both.
--
-- Because it is a CHECK, an Edge Function cannot get this wrong. That is
-- the difference between this and the Fapshi integration, where the same
-- kind of rule lived only in the code that was supposed to follow it.

ALTER TABLE finance.payment_intents
  DROP CONSTRAINT payment_intents_terminal_has_resulting_payment;

ALTER TABLE finance.payment_intents
  ADD CONSTRAINT payment_intents_settlement_matches_mode CHECK (
    CASE
      WHEN status <> 'succeeded' THEN
        resulting_payment_id IS NULL AND sandbox_payment_id IS NULL
      WHEN mode = 'live' THEN
        resulting_payment_id IS NOT NULL AND sandbox_payment_id IS NULL
      ELSE
        sandbox_payment_id IS NOT NULL AND resulting_payment_id IS NULL
    END
  );

COMMENT ON CONSTRAINT payment_intents_settlement_matches_mode ON finance.payment_intents IS
  'A sandbox intent can never reference finance.payments, and a live intent can never reference finance.sandbox_payments. Also holds the weaker original rule: an intent that has not succeeded references no settlement at all.';

-- And the mirror, from the settlement side: a sandbox settlement must belong
-- to a sandbox intent. Expressed as a trigger because a CHECK cannot read
-- another table.

CREATE OR REPLACE FUNCTION finance.sandbox_payments_require_sandbox_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  intent_mode finance.payment_mode;
BEGIN
  SELECT i.mode INTO intent_mode
    FROM finance.payment_intents i
   WHERE i.id = NEW.intent_id;

  IF intent_mode IS NULL THEN
    RAISE EXCEPTION 'sandbox payment references unknown intent %', NEW.intent_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF intent_mode <> 'sandbox' THEN
    RAISE EXCEPTION 'intent % is a % intent and cannot settle into finance.sandbox_payments',
      NEW.intent_id, intent_mode
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION finance.sandbox_payments_require_sandbox_intent() IS
  'Refuses a sandbox settlement whose intent is live. The reverse direction is covered by payment_intents_settlement_matches_mode; together they close the loop in both directions.';

CREATE TRIGGER sandbox_payments_require_sandbox_intent
  BEFORE INSERT OR UPDATE ON finance.sandbox_payments
  FOR EACH ROW EXECUTE FUNCTION finance.sandbox_payments_require_sandbox_intent();
