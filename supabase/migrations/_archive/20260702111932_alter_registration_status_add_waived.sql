-- Migration: alter_registration_status_add_waived
--
-- Phase 2 §3 amendment: registration state now has four values —
-- `not_required` / `unpaid` / `paid` / `waived`. Phase 1 modeled the
-- first three via `fee_required` + `marked_paid_at`. This migration
-- adds the `waived` pair and exposes the derived state through an
-- immutable helper function.
--
-- Mutual exclusion: a row cannot be both marked-paid AND waived —
-- they are semantically distinct actions and the audit log records
-- them separately. Enforced via CHECK.
--
-- Derived state contract (frozen):
--   NOT fee_required               → 'not_required'
--   waived_at IS NOT NULL          → 'waived'
--   marked_paid_at IS NOT NULL     → 'paid'
--   else                           → 'unpaid'

-------------------------------------------------------------------------------
-- 1. Columns
-------------------------------------------------------------------------------

ALTER TABLE core.registration_status
  ADD COLUMN waived_at TIMESTAMPTZ,
  ADD COLUMN waived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-------------------------------------------------------------------------------
-- 2. Consistency + mutual-exclusion CHECKs
-------------------------------------------------------------------------------

-- waived_at and waived_by move together (same pattern as marked_paid_*).
ALTER TABLE core.registration_status
  ADD CONSTRAINT registration_waived_consistent
  CHECK (
    (waived_at IS NULL AND waived_by IS NULL)
    OR (waived_at IS NOT NULL AND waived_by IS NOT NULL)
  );

-- A row cannot be both paid AND waived. The two are distinct admin
-- actions and the audit log distinguishes them.
ALTER TABLE core.registration_status
  ADD CONSTRAINT registration_paid_and_waived_mutex
  CHECK (NOT (marked_paid_at IS NOT NULL AND waived_at IS NOT NULL));

-- If fee_required=false, none of the payment/waiver timestamps may
-- be set. Extends the Phase 1 "amount only if required" check to
-- cover waived_at too.
ALTER TABLE core.registration_status
  DROP CONSTRAINT registration_amount_only_if_required;

ALTER TABLE core.registration_status
  ADD CONSTRAINT registration_amount_only_if_required
  CHECK (
    fee_required
    OR (amount IS NULL AND marked_paid_at IS NULL AND waived_at IS NULL)
  );

-------------------------------------------------------------------------------
-- 3. Derived-state helper — core.registration_state(row)
-------------------------------------------------------------------------------
-- Immutable SQL function so it can be used in indexes, generated
-- columns, and RLS predicates without re-execution. Consumers query
-- via `SELECT * FROM core.registration_status WHERE core.registration_state(t.*) = 'unpaid'`.

CREATE OR REPLACE FUNCTION core.registration_state(t core.registration_status)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN NOT t.fee_required          THEN 'not_required'
    WHEN t.waived_at IS NOT NULL     THEN 'waived'
    WHEN t.marked_paid_at IS NOT NULL THEN 'paid'
    ELSE 'unpaid'
  END;
$$;

COMMENT ON FUNCTION core.registration_state IS
  'Derived Phase 2 registration state (not_required | unpaid | paid | waived) from a core.registration_status row. Immutable — index-safe. Client mirror in packages/domain/src/registration/state.ts.';

-------------------------------------------------------------------------------
-- 4. Index — the "unregistered" filter (§4.2, E1.7c)
-------------------------------------------------------------------------------
-- The existing Phase 1 index only covered `marked_paid_at IS NULL`.
-- After this migration `waived` also disappears from the unregistered
-- filter, so replace with a state-derived predicate.

DROP INDEX IF EXISTS core.registration_status_unpaid_idx;

CREATE INDEX registration_status_unpaid_idx
  ON core.registration_status (membership_id)
  WHERE fee_required
    AND marked_paid_at IS NULL
    AND waived_at IS NULL;
