-- Migration: create_core_membership_related
--
-- The three membership sidecar tables — Phase 1 §3.6, §3.7, §3.8.
--
--   core.grouping_chapter_tags    — tags a branch member as "affiliated"
--                                    with a grouping chapter (§3.6).
--                                    Members stay at the parent branch;
--                                    the tag adds visibility.
--   core.membership_transfers      — transfer request lifecycle (§3.7).
--                                    Approvals delegate to
--                                    core.perform_transfer() for atomicity.
--   core.registration_status       — per-membership fee flag (§3.8).
--                                    Non-gating: an unpaid registration
--                                    doesn't stop membership from being
--                                    active — it's a searchable surface
--                                    for admin follow-up (see E1.7c).

-------------------------------------------------------------------------------
-- 1. core.grouping_chapter_tags
-------------------------------------------------------------------------------

CREATE TABLE core.grouping_chapter_tags (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  member_id                   UUID NOT NULL REFERENCES core.members(id) ON DELETE CASCADE,

  grouping_chapter_scope_id   UUID NOT NULL REFERENCES core.scopes(id) ON DELETE CASCADE,
  parent_branch_scope_id      UUID NOT NULL REFERENCES core.scopes(id) ON DELETE CASCADE,

  assigned_by                 UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  removed_by                  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  removed_at                  TIMESTAMPTZ,

  CONSTRAINT grouping_tags_remove_consistent
    CHECK (
      (removed_at IS NULL AND removed_by IS NULL)
      OR (removed_at IS NOT NULL AND removed_by IS NOT NULL)
    )
);

-- One active tag per (member, grouping_chapter). Re-assignment after
-- removal is fine.
CREATE UNIQUE INDEX grouping_tags_unique_active
  ON core.grouping_chapter_tags (member_id, grouping_chapter_scope_id)
  WHERE removed_at IS NULL;

CREATE INDEX grouping_tags_grouping_chapter_idx
  ON core.grouping_chapter_tags (grouping_chapter_scope_id);
CREATE INDEX grouping_tags_parent_branch_idx
  ON core.grouping_chapter_tags (parent_branch_scope_id);

-- Trigger: the grouping_chapter_scope_id must reference a chapter row
-- with chapter_kind='grouping', and the parent_branch_scope_id must
-- match that chapter's parent (which is a branch). CHECK can't do a
-- subquery so we validate here.

CREATE OR REPLACE FUNCTION core.grouping_tags_check_shape()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_scope_type   core.scope_type;
  v_chapter_kind core.chapter_kind;
  v_parent       UUID;
BEGIN
  SELECT scope_type, chapter_kind, parent_scope_id
    INTO v_scope_type, v_chapter_kind, v_parent
  FROM core.scopes
  WHERE id = NEW.grouping_chapter_scope_id;

  IF v_scope_type IS DISTINCT FROM 'chapter' THEN
    RAISE EXCEPTION 'grouping_chapter_scope_id must reference a chapter (got %)', v_scope_type
      USING ERRCODE = '23514';
  END IF;
  IF v_chapter_kind IS DISTINCT FROM 'grouping' THEN
    RAISE EXCEPTION 'grouping_chapter_scope_id must reference a grouping chapter (got kind %)', v_chapter_kind
      USING ERRCODE = '23514';
  END IF;
  IF v_parent IS DISTINCT FROM NEW.parent_branch_scope_id THEN
    RAISE EXCEPTION 'parent_branch_scope_id % does not match the chapter''s parent %', NEW.parent_branch_scope_id, v_parent
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER grouping_tags_shape_check
  BEFORE INSERT OR UPDATE OF grouping_chapter_scope_id, parent_branch_scope_id
  ON core.grouping_chapter_tags
  FOR EACH ROW EXECUTE FUNCTION core.grouping_tags_check_shape();

ALTER TABLE core.grouping_chapter_tags ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON core.grouping_chapter_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.grouping_chapter_tags TO service_role;

COMMENT ON TABLE core.grouping_chapter_tags IS
  'Tags a branch member as affiliated with a grouping chapter (§3.6). The member''s real membership stays at the parent branch; this tag adds visibility.';

-------------------------------------------------------------------------------
-- 2. core.membership_transfers
-------------------------------------------------------------------------------

CREATE TYPE core.membership_transfer_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

CREATE TABLE core.membership_transfers (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  member_id                UUID NOT NULL REFERENCES core.members(id) ON DELETE CASCADE,
  source_scope_id          UUID NOT NULL REFERENCES core.scopes(id) ON DELETE RESTRICT,
  destination_scope_id     UUID NOT NULL REFERENCES core.scopes(id) ON DELETE RESTRICT,

  requested_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  approved_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at              TIMESTAMPTZ,
  rejected_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at              TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,

  status                   core.membership_transfer_status NOT NULL DEFAULT 'pending',

  reason                   TEXT,
  metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT transfers_approve_consistent
    CHECK (
      (approved_at IS NULL AND approved_by IS NULL)
      OR (approved_at IS NOT NULL AND approved_by IS NOT NULL)
    ),
  CONSTRAINT transfers_reject_consistent
    CHECK (
      (rejected_at IS NULL AND rejected_by IS NULL)
      OR (rejected_at IS NOT NULL AND rejected_by IS NOT NULL)
    ),
  CONSTRAINT transfers_status_terminal_columns
    CHECK (
      (status = 'approved'  AND approved_at  IS NOT NULL)
      OR (status = 'rejected' AND rejected_at IS NOT NULL)
      OR (status = 'cancelled' AND cancelled_at IS NOT NULL)
      OR (status = 'pending')
    ),
  CONSTRAINT transfers_source_dest_different
    CHECK (source_scope_id <> destination_scope_id)
);

CREATE INDEX transfers_member_id_idx      ON core.membership_transfers (member_id);
CREATE INDEX transfers_status_idx         ON core.membership_transfers (status);
CREATE INDEX transfers_source_scope_idx   ON core.membership_transfers (source_scope_id);
CREATE INDEX transfers_destination_scope_idx ON core.membership_transfers (destination_scope_id);

-- At most one PENDING transfer per member at a time — a member can't
-- have two pending destinations simultaneously.
CREATE UNIQUE INDEX transfers_one_pending_per_member
  ON core.membership_transfers (member_id)
  WHERE status = 'pending';

ALTER TABLE core.membership_transfers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON core.membership_transfers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.membership_transfers TO service_role;

COMMENT ON TABLE core.membership_transfers IS
  'Transfer request lifecycle (§3.7). Approvals delegate to core.perform_transfer for atomicity.';

-------------------------------------------------------------------------------
-- 3. core.registration_status
-------------------------------------------------------------------------------

CREATE TABLE core.registration_status (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  membership_id     UUID NOT NULL UNIQUE REFERENCES core.memberships(id) ON DELETE CASCADE,

  fee_required      BOOLEAN NOT NULL DEFAULT FALSE,
  amount            NUMERIC(12, 2),
  currency_code     TEXT DEFAULT 'XAF',

  marked_paid_at    TIMESTAMPTZ,
  marked_paid_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT registration_paid_consistent
    CHECK (
      (marked_paid_at IS NULL AND marked_paid_by IS NULL)
      OR (marked_paid_at IS NOT NULL AND marked_paid_by IS NOT NULL)
    ),
  -- If fee_required=false, amount and marked_paid_* should stay null.
  CONSTRAINT registration_amount_only_if_required
    CHECK (fee_required OR (amount IS NULL AND marked_paid_at IS NULL))
);

CREATE TRIGGER registration_status_set_updated_at
  BEFORE UPDATE ON core.registration_status
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE INDEX registration_status_membership_id_idx
  ON core.registration_status (membership_id);
CREATE INDEX registration_status_unpaid_idx
  ON core.registration_status (marked_paid_at)
  WHERE fee_required AND marked_paid_at IS NULL;

ALTER TABLE core.registration_status ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON core.registration_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.registration_status TO service_role;

COMMENT ON TABLE core.registration_status IS
  'Per-membership registration-fee tracking (§3.8). NON-GATING: membership stays active regardless — this is a searchable flag so Exco can find unregistered members (E1.7c filter).';
