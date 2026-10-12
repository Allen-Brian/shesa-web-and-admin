-- Migration: finance_payment_intents
--
-- Phase 3 M4B — persistent state for the simulated payment provider.
--
-- The M1 domain-level SimulatedProvider stores intents in a Map inside
-- one process. That's fine for unit tests but breaks the moment the
-- initiate call lands on Edge Function invocation A and the confirm
-- call lands on invocation B. Real MoMo / Orange providers face the
-- same problem structurally, so we solve it once here with a durable
-- table that persists intents across processes.
--
-- Lifecycle:
--   1. payments/initiate inserts a row with status='pending' and
--      available_from = now() + provider delay. Returns intentId.
--   2. Frontend / operator polls payments/confirm(intentId).
--   3. confirm reads the row:
--        * available_from > now()  → status stays 'pending'
--        * available_from <= now() → success path: INSERT payment row,
--          update intent to status='succeeded' + resulting_payment_id.
--   4. Optional 'failed' / 'cancelled' terminal states — not wired for
--      the simulator's happy path but supported by the schema so real
--      providers can flip them from webhooks.
--
-- Time-based confirmation replaces the M1 SimulatedProvider's setTimeout
-- pattern — the edge function doesn't block waiting for the ~3s delay,
-- it just refuses to succeed until enough wall-time has passed. That
-- matches how real providers work (poll until webhook arrives).

-- Status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_intent_status' AND typnamespace = 'finance'::regnamespace) THEN
    CREATE TYPE finance.payment_intent_status AS ENUM (
      'pending',
      'succeeded',
      'failed',
      'cancelled'
    );
  END IF;
END $$;

CREATE TABLE finance.payment_intents (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target — same shape as finance.payments.
  obligation_id          UUID NULL REFERENCES finance.obligations(id) ON DELETE RESTRICT,
  charge_id              UUID NULL REFERENCES finance.charges(id) ON DELETE RESTRICT,
  scope_id               UUID NOT NULL REFERENCES core.scopes(id) ON DELETE RESTRICT,

  payer_member_id        UUID NULL REFERENCES core.members(id) ON DELETE SET NULL,

  amount                 NUMERIC(20, 4) NOT NULL CHECK (amount > 0),
  currency               TEXT NOT NULL,
  method                 finance.payment_method NOT NULL,

  status                 finance.payment_intent_status NOT NULL DEFAULT 'pending',

  -- When the intent becomes available for a successful confirm. In the
  -- simulator this is initiate_time + delay; real providers ignore it
  -- and drive the transition off webhook events instead.
  available_from         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Populated on 'succeeded'. FK to the payment row confirm() inserts.
  resulting_payment_id   UUID NULL REFERENCES finance.payments(id) ON DELETE RESTRICT,

  -- Optional failure reason (for real providers; simulator forceOutcome).
  failure_reason         TEXT NULL,

  -- Freeform bag for provider-specific state.
  metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_by             UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT payment_intents_targets_something CHECK (
    obligation_id IS NOT NULL OR charge_id IS NOT NULL
  ),
  CONSTRAINT payment_intents_terminal_has_resulting_payment CHECK (
    (status = 'succeeded' AND resulting_payment_id IS NOT NULL)
    OR (status <> 'succeeded')
  )
);

CREATE INDEX payment_intents_scope_status_idx
  ON finance.payment_intents (scope_id, status);
CREATE INDEX payment_intents_payer_idx
  ON finance.payment_intents (payer_member_id) WHERE payer_member_id IS NOT NULL;
CREATE INDEX payment_intents_pending_available_idx
  ON finance.payment_intents (available_from) WHERE status = 'pending';

COMMENT ON TABLE finance.payment_intents IS
  'Persistent intent state for the payment provider seam. The M1 domain SimulatedProvider stores intents in-memory; this table survives across processes. Real MTN/Orange/card providers reuse the same table when they land.';

-------------------------------------------------------------------------------
-- RLS
-------------------------------------------------------------------------------

ALTER TABLE finance.payment_intents ENABLE ROW LEVEL SECURITY;

-- SELECT: same pattern as payments — scoped by treasury.read at scope,
-- plus own-payer path via core.member_accounts.

CREATE POLICY payment_intents_select_at_scope ON finance.payment_intents
  FOR SELECT TO authenticated
  USING (
    core.has_permission(auth.uid(), scope_id, 'treasury.read')
    OR core.has_permission(auth.uid(), scope_id, 'finance.read')
  );

CREATE POLICY payment_intents_select_own ON finance.payment_intents
  FOR SELECT TO authenticated
  USING (
    payer_member_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM core.member_accounts ma
      WHERE ma.member_id = payer_member_id
        AND ma.auth_user_id = auth.uid()
    )
  );

-- INSERT / UPDATE gated to service_role via the edge functions. No
-- authenticated policy = default deny.

GRANT SELECT ON finance.payment_intents TO authenticated;
GRANT INSERT, UPDATE ON finance.payment_intents TO service_role;
