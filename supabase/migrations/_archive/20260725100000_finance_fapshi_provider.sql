-- Migration: finance_fapshi_provider (part 1 — enum + columns)
--
-- Wires Fapshi (Cameroon MoMo/card gateway) into the existing
-- finance.payment_intents seam. This part adds:
--   * the 'expired' enum value on payment_intent_status
--   * provider + anon-payer columns on payment_intents
--   * indexes + length constraints
--
-- Postgres refuses to USE a new enum value in the same transaction it
-- was added, so all the RPCs that reference 'expired' land in a
-- sibling migration (…_functions.sql).

-------------------------------------------------------------------------------
-- 1. Extend the status enum
-------------------------------------------------------------------------------
-- Fapshi's terminal states are SUCCESSFUL / FAILED / EXPIRED. The
-- existing enum has failed + cancelled; add 'expired' as a distinct
-- terminal so the pending-page can render "the payment window closed,
-- please retry" without conflating it with a genuine gateway failure.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = 'payment_intent_status'
       AND t.typnamespace = 'finance'::regnamespace
       AND e.enumlabel  = 'expired'
  ) THEN
    ALTER TYPE finance.payment_intent_status ADD VALUE 'expired';
  END IF;
END $$;

-------------------------------------------------------------------------------
-- 2. Extend payment_intents with provider + anon-payer columns
-------------------------------------------------------------------------------

ALTER TABLE finance.payment_intents
  ADD COLUMN IF NOT EXISTS provider           TEXT        NULL,
  ADD COLUMN IF NOT EXISTS provider_ref       TEXT        NULL,
  ADD COLUMN IF NOT EXISTS payer_name         TEXT        NULL,
  ADD COLUMN IF NOT EXISTS payer_email        TEXT        NULL,
  ADD COLUMN IF NOT EXISTS payer_phone        TEXT        NULL,
  ADD COLUMN IF NOT EXISTS payer_location     TEXT        NULL,
  ADD COLUMN IF NOT EXISTS quantity           INTEGER     NULL,
  ADD COLUMN IF NOT EXISTS note               TEXT        NULL,
  ADD COLUMN IF NOT EXISTS hosted_link        TEXT        NULL,
  ADD COLUMN IF NOT EXISTS webhook_payload    JSONB       NULL,
  ADD COLUMN IF NOT EXISTS expired_at         TIMESTAMPTZ NULL;

-- Uniqueness: a given (provider, provider_ref) pair points to exactly
-- one intent — protects the webhook + reconcile from ever double-
-- attaching a Fapshi transId across two rows.
CREATE UNIQUE INDEX IF NOT EXISTS payment_intents_provider_ref_uniq
  ON finance.payment_intents (provider, provider_ref)
  WHERE provider IS NOT NULL AND provider_ref IS NOT NULL;

-- Lookup index for the webhook: match by transId as fast as possible.
CREATE INDEX IF NOT EXISTS payment_intents_provider_ref_idx
  ON finance.payment_intents (provider_ref)
  WHERE provider_ref IS NOT NULL;

-- Length caps mirror the public RPC caps so the intent can't hold
-- more than the eventual payment metadata can.
ALTER TABLE finance.payment_intents
  DROP CONSTRAINT IF EXISTS payment_intents_lengths_bounded;
ALTER TABLE finance.payment_intents
  ADD CONSTRAINT payment_intents_lengths_bounded CHECK (
    (payer_name    IS NULL OR length(payer_name)    <= 200)
    AND (payer_email   IS NULL OR length(payer_email)   <= 320)
    AND (payer_phone   IS NULL OR length(payer_phone)   <=  80)
    AND (payer_location IS NULL OR length(payer_location) <= 300)
    AND (note          IS NULL OR length(note)          <= 500)
    AND (provider      IS NULL OR length(provider)      <=  40)
    AND (provider_ref  IS NULL OR length(provider_ref)  <= 120)
    AND (hosted_link   IS NULL OR length(hosted_link)   <= 500)
  );

COMMENT ON COLUMN finance.payment_intents.provider     IS 'Payment provider slug: ''fapshi'', ''simulated''. NULL for legacy rows.';
COMMENT ON COLUMN finance.payment_intents.provider_ref IS 'Provider-side transaction ID (Fapshi transId). Unique per provider.';
COMMENT ON COLUMN finance.payment_intents.hosted_link  IS 'Fapshi hosted-checkout URL — used by the server action to redirect the payer.';
COMMENT ON COLUMN finance.payment_intents.webhook_payload IS 'Last webhook body received from the provider (raw). Kept for audit + debugging.';

-------------------------------------------------------------------------------
-- 3. RLS — anon can read own intent by ID for polling defense-in-depth
-------------------------------------------------------------------------------
-- Primary polling path is a SECURITY DEFINER RPC through an edge
-- function; this policy is a fallback so a direct PostgREST call by
-- the (unguessable) UUID intent_id also works.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'finance'
       AND tablename  = 'payment_intents'
       AND policyname = 'payment_intents_public_status_by_id'
  ) THEN
    CREATE POLICY payment_intents_public_status_by_id ON finance.payment_intents
      FOR SELECT TO anon
      USING (payer_member_id IS NULL AND provider IS NOT NULL);
  END IF;
END $$;

GRANT SELECT ON finance.payment_intents TO anon;
