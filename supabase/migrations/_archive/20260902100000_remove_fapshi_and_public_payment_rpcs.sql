-- Migration: remove_fapshi_and_public_payment_rpcs
--
-- Retires the Fapshi payment integration and closes the two critical
-- findings that lived alongside it. Tranzak is the intended replacement
-- provider; nothing provider-specific is added here, because the seam it
-- will attach to (finance.payment_intents + the payments/confirm edge
-- function) already exists and stays untouched.
--
-- Three things happen:
--
--   1. Every Fapshi-specific database object is dropped.
--
--   2. The four anon-executable public finance RPCs are dropped. Two of
--      them (record_public_ticket_purchase, record_public_donation) wrote
--      a real finance.payments row — firing the ledger writer, the
--      obligation-status recompute and the receipt generator — with no
--      evidence that any money had moved, and accepted the full
--      payment_method enum from an unauthenticated caller. The other two
--      only existed to start a Fapshi checkout.
--
--   3. A standalone cms.agm_registrations table replaces them for the
--      AGM 2026 window. It captures who registered and what they chose,
--      and deliberately touches NOTHING in the finance schema: no
--      payment, no ledger entry, no obligation, no receipt. Finance
--      reconciles against it by hand until Tranzak is live.
--
-- The `expired` value on finance.payment_intent_status is left in place.
-- Postgres cannot drop an enum label without recreating the type, and the
-- squashed baseline (Phase 3) simply won't declare it. An unused label is
-- harmless in the interim.

BEGIN;

-------------------------------------------------------------------------------
-- 1. Fapshi provider objects
-------------------------------------------------------------------------------

-- 1a. The reconcile cron job. Guarded — pg_cron is not installed
--     everywhere, and an unguarded reference takes the migration down
--     with it (see 20260725100200 for the incident this pattern came
--     from).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('fapshi-reconcile-every-2min')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fapshi-reconcile-every-2min');
  END IF;
END $$;

-- 1b. Provider-side RPCs (service_role only).
DROP FUNCTION IF EXISTS finance.attach_fapshi_ref(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS finance.finalize_fapshi_intent(TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS finance.mark_fapshi_intent_terminal(TEXT, finance.payment_intent_status, TEXT, JSONB);
DROP FUNCTION IF EXISTS finance.list_pending_fapshi_intents_for_reconcile(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS finance.get_public_intent_status(UUID);

-- 1c. SEC-02 — the anon read policy on payment_intents.
--
-- The intent was "anon may read its own intent by an unguessable UUID",
-- but the predicate carried no id term, so it admitted EVERY public-flow
-- row to every anonymous caller: payer_name, payer_email, payer_phone,
-- payer_location, amount, note and the raw provider webhook body. A
-- single unauthenticated GET returned the table.
DROP POLICY IF EXISTS payment_intents_public_status_by_id ON finance.payment_intents;
REVOKE SELECT ON finance.payment_intents FROM anon;

-- USAGE on the schema stays: finance.verify_receipt is anon-executable
-- and needs it. Function-level EXECUTE grants are what gate that path.

-- 1d. Provider columns + indexes.
--
-- payer_name / payer_email / payer_phone / payer_location / quantity /
-- note arrived in the same migration but belong to the public flow, not
-- to Fapshi. They stay.
DROP INDEX IF EXISTS finance.payment_intents_provider_ref_uniq;
DROP INDEX IF EXISTS finance.payment_intents_provider_ref_idx;

ALTER TABLE finance.payment_intents
  DROP COLUMN IF EXISTS provider,
  DROP COLUMN IF EXISTS provider_ref,
  DROP COLUMN IF EXISTS hosted_link,
  DROP COLUMN IF EXISTS webhook_payload,
  DROP COLUMN IF EXISTS expired_at;

-- The length constraint referenced the dropped columns; restate it over
-- the ones that remain.
ALTER TABLE finance.payment_intents
  DROP CONSTRAINT IF EXISTS payment_intents_lengths_bounded;
ALTER TABLE finance.payment_intents
  ADD CONSTRAINT payment_intents_lengths_bounded CHECK (
    (payer_name     IS NULL OR length(payer_name)     <= 200)
    AND (payer_email    IS NULL OR length(payer_email)    <= 320)
    AND (payer_phone    IS NULL OR length(payer_phone)    <=  80)
    AND (payer_location IS NULL OR length(payer_location) <= 300)
    AND (note           IS NULL OR length(note)           <= 500)
  );

-------------------------------------------------------------------------------
-- 2. SEC-01 — the forgeable public payment RPCs
-------------------------------------------------------------------------------
-- Dropped outright rather than restricted. There is no longer any
-- legitimate anonymous caller: public submissions land in
-- cms.agm_registrations (section 3) and a real payment is only ever
-- created by an authenticated operator through payments/record-manual or
-- payments/confirm, both of which check `payment.record` at the scope.

DROP FUNCTION IF EXISTS finance.record_public_ticket_purchase(
  UUID, INTEGER, finance.payment_method, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS finance.record_public_donation(
  UUID, NUMERIC, TEXT, finance.payment_method, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS finance.initiate_public_ticket_intent(
  UUID, INTEGER, finance.payment_method, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS finance.initiate_public_donation_intent(
  UUID, NUMERIC, TEXT, finance.payment_method, TEXT, TEXT, TEXT, TEXT);

-------------------------------------------------------------------------------
-- 3. cms.agm_registrations — the interim capture table
-------------------------------------------------------------------------------
-- A predecessor, cms.agm_tickets, did this job before the finance model
-- took over (dropped in 20260722100001). It shipped with
-- `FOR SELECT TO anon USING (TRUE)` — every registrant's contact details
-- world-readable — and `FOR UPDATE/DELETE TO authenticated USING (TRUE)`.
-- This replacement grants anon no table privilege at all: inserts go
-- through a SECURITY DEFINER RPC, and reads require finance authority at
-- Mainstream.

CREATE TABLE cms.agm_registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Short human-quotable code. Shown on the confirmation page and used
  -- as its URL segment. 10 hex chars ≈ 1.1e12 space — not a secret, but
  -- not walkable either.
  reference       TEXT NOT NULL UNIQUE,

  kind            TEXT NOT NULL CHECK (kind IN ('ticket', 'attire', 'donation')),

  full_name       TEXT NOT NULL CHECK (length(full_name) BETWEEN 2 AND 200),
  email           TEXT NULL     CHECK (email IS NULL OR length(email) <= 320),
  -- Phone is mandatory across all three forms: it is the only reliable
  -- way to reach a Cameroonian registrant to settle payment. The floor
  -- of 9 is the length of a local mobile number; `+237…` forms are
  -- longer, so it accepts both.
  phone           TEXT NOT NULL CHECK (length(phone) BETWEEN 9 AND 80),

  quantity        INTEGER NULL  CHECK (quantity IS NULL OR (quantity > 0 AND quantity <= 20)),
  amount_xaf      NUMERIC(20, 4) NOT NULL CHECK (amount_xaf > 0 AND amount_xaf <= 100000000),
  attire_size     TEXT NULL     CHECK (attire_size IS NULL OR attire_size IN ('S','M','L','XL','XXL')),

  -- The option the visitor picked. Recorded so the data is ready for
  -- Tranzak; it asserts an intention, never a settlement.
  payment_method  TEXT NOT NULL CHECK (payment_method IN (
                    'mtn-momo', 'orange-money', 'card', 'bank-transfer', 'cash-on-site')),

  note            TEXT NULL     CHECK (note IS NULL OR length(note) <= 500),

  -- Set by an operator once money is confirmed received out-of-band.
  -- Deliberately NOT wired to finance.payments — reconciliation is
  -- manual until Tranzak lands.
  settled_at      TIMESTAMPTZ NULL,
  settled_by      UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT agm_registrations_ticket_has_quantity CHECK (
    (kind IN ('ticket', 'attire') AND quantity IS NOT NULL)
    OR (kind = 'donation' AND quantity IS NULL)
  ),
  CONSTRAINT agm_registrations_attire_has_size CHECK (
    (kind = 'attire' AND attire_size IS NOT NULL)
    OR (kind <> 'attire' AND attire_size IS NULL)
  ),
  CONSTRAINT agm_registrations_settlement_consistent CHECK (
    (settled_at IS NULL) = (settled_by IS NULL)
  )
);

CREATE INDEX agm_registrations_created_idx   ON cms.agm_registrations (created_at DESC);
CREATE INDEX agm_registrations_kind_idx      ON cms.agm_registrations (kind);
CREATE INDEX agm_registrations_unsettled_idx ON cms.agm_registrations (created_at)
  WHERE settled_at IS NULL;

COMMENT ON TABLE cms.agm_registrations IS
  'AGM 2026 public submissions captured while no payment provider is connected. Writes NOTHING to the finance schema — no payment, ledger entry, obligation or receipt. Finance reconciles by hand until Tranzak is integrated, then this table is retired.';
COMMENT ON COLUMN cms.agm_registrations.payment_method IS
  'The option the visitor selected. An intention, never a settlement — nothing in this table implies money was received.';
COMMENT ON COLUMN cms.agm_registrations.settled_at IS
  'Set by an operator who confirmed payment out-of-band. Not connected to finance.payments by design.';

-------------------------------------------------------------------------------
-- 4. RLS on cms.agm_registrations
-------------------------------------------------------------------------------

ALTER TABLE cms.agm_registrations ENABLE ROW LEVEL SECURITY;

-- Reads require finance authority at Mainstream. No anon SELECT policy
-- and no anon SELECT grant: contact details for every registrant are
-- exactly the PII that SEC-02 leaked, and the predecessor table leaked
-- the same way.
CREATE POLICY agm_registrations_select_finance ON cms.agm_registrations
  FOR SELECT TO authenticated
  USING (
    core.has_permission(auth.uid(), core.mainstream_scope_id(), 'treasury.read')
    OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'finance.read')
  );

-- Marking a row settled needs the same authority that recording a
-- payment does.
CREATE POLICY agm_registrations_update_finance ON cms.agm_registrations
  FOR UPDATE TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'finance.write'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'finance.write'));

-- No INSERT policy: the only write path is the SECURITY DEFINER RPC
-- below. No DELETE policy at all.

-- The schema-wide ALTER DEFAULT PRIVILEGES from 20260715100000 would
-- otherwise hand anon SELECT and authenticated DML on this table the
-- moment it was created. Revoke explicitly. (The blanket default
-- privileges themselves are addressed separately — see SEC-12.)
REVOKE ALL ON cms.agm_registrations FROM anon;
REVOKE ALL ON cms.agm_registrations FROM authenticated;
GRANT SELECT, UPDATE ON cms.agm_registrations TO authenticated;
GRANT ALL ON cms.agm_registrations TO service_role;

-------------------------------------------------------------------------------
-- 5. submit_agm_registration — the one public write path
-------------------------------------------------------------------------------
-- Anon-executable. Validates shape, generates the reference, inserts,
-- and returns the reference so the caller can render a confirmation.
-- It cannot touch finance: this function's entire reachable surface is
-- one INSERT into one cms table.

CREATE OR REPLACE FUNCTION cms.submit_agm_registration(
  p_kind           TEXT,
  p_full_name      TEXT,
  p_phone          TEXT,
  p_amount_xaf     NUMERIC,
  p_payment_method TEXT,
  p_email          TEXT DEFAULT NULL,
  p_quantity       INTEGER DEFAULT NULL,
  p_attire_size    TEXT DEFAULT NULL,
  p_note           TEXT DEFAULT NULL
)
RETURNS TABLE (reference TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, cms, public
AS $$
DECLARE
  v_reference TEXT;
BEGIN
  IF p_full_name IS NULL OR length(trim(p_full_name)) < 2 THEN
    RAISE EXCEPTION 'full_name is required' USING ERRCODE = '22023';
  END IF;

  -- Phone is mandatory. Enforced here as well as in the form and the
  -- server action, so the rule holds against a direct RPC call.
  IF p_phone IS NULL OR length(trim(p_phone)) < 9 THEN
    RAISE EXCEPTION 'phone is required' USING ERRCODE = '22023';
  END IF;

  IF p_kind NOT IN ('ticket', 'attire', 'donation') THEN
    RAISE EXCEPTION 'unknown registration kind' USING ERRCODE = '22023';
  END IF;

  IF p_amount_xaf IS NULL OR p_amount_xaf <= 0 THEN
    RAISE EXCEPTION 'amount must be positive' USING ERRCODE = '22023';
  END IF;

  -- Ceilings mirror the table CHECKs so a bad request fails with a
  -- readable message rather than a raw check_violation.
  IF p_quantity IS NOT NULL AND (p_quantity <= 0 OR p_quantity > 20) THEN
    RAISE EXCEPTION 'quantity must be between 1 and 20' USING ERRCODE = '22023';
  END IF;

  v_reference := 'AGM-' || upper(substring(replace(gen_random_uuid()::text, '-', '') FOR 10));

  INSERT INTO cms.agm_registrations
    (reference, kind, full_name, email, phone,
     quantity, amount_xaf, attire_size, payment_method, note)
  VALUES
    (v_reference, p_kind, trim(p_full_name), nullif(trim(coalesce(p_email, '')), ''), trim(p_phone),
     p_quantity, p_amount_xaf, p_attire_size, p_payment_method,
     nullif(trim(coalesce(p_note, '')), ''));

  RETURN QUERY SELECT v_reference;
END;
$$;

REVOKE ALL ON FUNCTION cms.submit_agm_registration(
  TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cms.submit_agm_registration(
  TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, INTEGER, TEXT, TEXT)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION cms.submit_agm_registration IS
  'The only public write path for AGM 2026 submissions. SECURITY DEFINER, anon-executable, and reachable surface is one INSERT into cms.agm_registrations. Creates no payment, receipt or ledger entry.';

COMMIT;
