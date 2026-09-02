-- Migration: extend_registration_status
--
-- Extends `core.registration_status` for the 2026-07-03 lock: registration
-- is a per-membership status with FIVE derivable states, not a boolean.
-- States are:
--   not_required — no fee active at join time (fee_required = FALSE)
--   pending      — fee active, nothing paid/waived/on-behalf yet
--   paid         — member paid themselves (marked_paid_at set)
--   paid_on_behalf — someone else paid on their behalf (new columns)
--   waived       — an admin waived the fee (new columns)
--
-- New columns:
--   waived_at, waived_by, waived_reason      — waive action bookkeeping
--   paid_on_behalf_at, paid_on_behalf_by,    — pay-on-behalf bookkeeping
--     paid_on_behalf_note
--
-- The three terminal states (paid / paid_on_behalf / waived) are mutually
-- exclusive at the row level — the extended `registration_paid_consistent`
-- CHECK enforces "at most one terminal timestamp set." Correcting a wrong
-- entry to a different non-null terminal state stays legal (an admin
-- fixing a mis-keyed registration nulls one terminal and sets another in
-- the same UPDATE).

-------------------------------------------------------------------------------
-- 1. New columns
-------------------------------------------------------------------------------

ALTER TABLE core.registration_status
  ADD COLUMN IF NOT EXISTS waived_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS waived_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS waived_reason         TEXT,
  ADD COLUMN IF NOT EXISTS paid_on_behalf_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_on_behalf_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paid_on_behalf_note   TEXT;

COMMENT ON COLUMN core.registration_status.waived_at IS
  'Timestamp when an admin waived this registration fee. Paired with waived_by + waived_reason.';
COMMENT ON COLUMN core.registration_status.paid_on_behalf_at IS
  'Timestamp when someone (paid_on_behalf_by) paid the registration on this member''s behalf. paid_on_behalf_note captures the payer''s context.';

-------------------------------------------------------------------------------
-- 2. Consistency CHECKs
-------------------------------------------------------------------------------

-- Extend the paid-consistency CHECK to cover the two new terminal columns.
-- Each terminal state (paid, paid_on_behalf, waived) must have BOTH its
-- timestamp and its actor set together, or both NULL.
ALTER TABLE core.registration_status
  DROP CONSTRAINT IF EXISTS registration_paid_consistent;

ALTER TABLE core.registration_status
  DROP CONSTRAINT IF EXISTS registration_terminals_consistent;

ALTER TABLE core.registration_status
  ADD CONSTRAINT registration_terminals_consistent
    CHECK (
      -- marked_paid_at ↔ marked_paid_by
      (
        (marked_paid_at IS NULL AND marked_paid_by IS NULL)
        OR (marked_paid_at IS NOT NULL AND marked_paid_by IS NOT NULL)
      )
      AND
      -- waived_at ↔ waived_by
      (
        (waived_at IS NULL AND waived_by IS NULL)
        OR (waived_at IS NOT NULL AND waived_by IS NOT NULL)
      )
      AND
      -- paid_on_behalf_at ↔ paid_on_behalf_by
      (
        (paid_on_behalf_at IS NULL AND paid_on_behalf_by IS NULL)
        OR (paid_on_behalf_at IS NOT NULL AND paid_on_behalf_by IS NOT NULL)
      )
    );

-- The three terminal states are mutually exclusive — at most one may be
-- set on a given row. (Zero is legal: pending / not_required.)
ALTER TABLE core.registration_status
  DROP CONSTRAINT IF EXISTS registration_terminals_mutually_exclusive;

ALTER TABLE core.registration_status
  ADD CONSTRAINT registration_terminals_mutually_exclusive
    CHECK (
      (
        (CASE WHEN marked_paid_at IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN waived_at IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN paid_on_behalf_at IS NOT NULL THEN 1 ELSE 0 END)
      ) <= 1
    );

-- If fee_required = FALSE, none of the terminal timestamps may be set
-- (nothing to pay, nothing to waive). Replaces the previous
-- `registration_amount_only_if_required` which only covered marked_paid.
ALTER TABLE core.registration_status
  DROP CONSTRAINT IF EXISTS registration_amount_only_if_required;

ALTER TABLE core.registration_status
  DROP CONSTRAINT IF EXISTS registration_terminals_only_if_required;

ALTER TABLE core.registration_status
  ADD CONSTRAINT registration_terminals_only_if_required
    CHECK (
      fee_required
      OR (
        amount IS NULL
        AND marked_paid_at IS NULL
        AND waived_at IS NULL
        AND paid_on_behalf_at IS NULL
      )
    );

-------------------------------------------------------------------------------
-- 3. Derived-state helper
-------------------------------------------------------------------------------
-- Single source of truth for "what state is this row in?" — every read
-- path (RLS-safe view, domain helper resolveRegistrationState, filter
-- dialog) calls this. Returns one of:
--   'not_required' | 'pending' | 'paid' | 'paid_on_behalf' | 'waived'
-- Returns NULL only if the row is malformed (defensive; the CHECKs
-- above should make this unreachable).

CREATE OR REPLACE FUNCTION core.registration_state(
  p_fee_required          BOOLEAN,
  p_marked_paid_at        TIMESTAMPTZ,
  p_waived_at             TIMESTAMPTZ,
  p_paid_on_behalf_at     TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN NOT p_fee_required                THEN 'not_required'
    WHEN p_marked_paid_at    IS NOT NULL   THEN 'paid'
    WHEN p_waived_at         IS NOT NULL   THEN 'waived'
    WHEN p_paid_on_behalf_at IS NOT NULL   THEN 'paid_on_behalf'
    ELSE                                        'pending'
  END;
$$;

COMMENT ON FUNCTION core.registration_state(BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Derives one of not_required | pending | paid | paid_on_behalf | waived from a registration_status row''s columns. IMMUTABLE for query planner + filter reuse.';

REVOKE ALL ON FUNCTION core.registration_state(BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.registration_state(BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
