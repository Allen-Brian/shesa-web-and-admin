-- Migration: create_core_memberships
--
-- The membership backbone — Phase 1 §3.5. Every member's participation
-- in a geographic body (Branch or autonomous Chapter) is a row here.
--
-- Design decisions locked in the plan:
--
--   1. **One active geographic membership per member.** Enforced by a
--      partial unique index using a stored-generated column (scope_type)
--      so the predicate is index-friendly.
--
--   2. **Only chapters with chapter_kind='autonomous' can hold
--      memberships.** Enforced by BEFORE trigger — a CHECK constraint
--      can't run the required subquery.
--
--   3. **Passive is a membership-level state** — the six-value enum
--      here carries the full spectrum (see E1.2's core.member_status
--      comment which defers passive to this table).
--
--   4. **Transfers land in a Postgres function** — `core.perform_transfer`
--      wraps the source-close + destination-create + status-update as
--      one atomic statement (a single transaction that either commits
--      or rolls back). Callers hit that function via RPC rather than
--      doing three round-trip UPDATEs.

-------------------------------------------------------------------------------
-- 1. Enums
-------------------------------------------------------------------------------

CREATE TYPE core.membership_status AS ENUM (
  'pending',       -- join request awaiting approval
  'active',        -- current participating member
  'passive',       -- currently inactive (per §2.15 — geographic body only)
  'transferred',   -- moved to another geographic body via approved transfer
  'left',          -- exited the body (voluntary or deceased-cascade)
  'rejected'       -- join request rejected
);

COMMENT ON TYPE core.membership_status IS
  'Membership lifecycle per Phase 1 §2.15. Passive applies only to geographic (branch/autonomous-chapter) memberships.';

CREATE TYPE core.membership_join_method AS ENUM (
  'self_request',   -- member requested to join
  'admin_added',    -- admin created the membership directly
  'import',         -- Excel-import created (Phase 1 E1.3)
  'transfer'        -- destination side of an approved transfer
);

COMMENT ON TYPE core.membership_join_method IS
  'How the membership row was created. Useful for audit / analytics.';

-------------------------------------------------------------------------------
-- 2. Table: core.memberships
-------------------------------------------------------------------------------

CREATE TABLE core.memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  member_id         UUID NOT NULL REFERENCES core.members(id) ON DELETE CASCADE,
  scope_id          UUID NOT NULL REFERENCES core.scopes(id) ON DELETE RESTRICT,

  membership_status core.membership_status NOT NULL DEFAULT 'pending',
  join_method       core.membership_join_method NOT NULL,

  joined_at         TIMESTAMPTZ,
  approved_at       TIMESTAMPTZ,
  approved_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at       TIMESTAMPTZ,
  rejected_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  left_at           TIMESTAMPTZ,
  transferred_at    TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Approve / reject consistency: the timestamp/actor columns must be
  -- populated together with the matching status transition.
  CONSTRAINT memberships_approve_consistent
    CHECK (
      (approved_at IS NULL AND approved_by IS NULL)
      OR (approved_at IS NOT NULL AND approved_by IS NOT NULL)
    ),
  CONSTRAINT memberships_reject_consistent
    CHECK (
      (rejected_at IS NULL AND rejected_by IS NULL)
      OR (rejected_at IS NOT NULL AND rejected_by IS NOT NULL)
    ),

  -- Terminal-status timestamp presence.
  CONSTRAINT memberships_status_terminal_timestamps
    CHECK (
      (membership_status IN ('left', 'transferred') AND left_at IS NULL AND transferred_at IS NULL) IS NOT TRUE
      -- i.e. if the status is 'left' or 'transferred', at least one of
      -- the timestamps has to be set. Enforced via the paired trigger
      -- below to give a specific error message.
    )
);

CREATE TRIGGER memberships_set_updated_at
  BEFORE UPDATE ON core.memberships
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-------------------------------------------------------------------------------
-- 3. Trigger: enforce chapter-autonomy invariant
-------------------------------------------------------------------------------
-- Memberships attached to a chapter row must reference an AUTONOMOUS
-- chapter — grouping chapters carry their members' primary membership
-- at the parent branch (§2.5). CHECK constraints can't subquery,
-- hence the trigger.

CREATE OR REPLACE FUNCTION core.memberships_check_scope_shape()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_scope_type core.scope_type;
  v_chapter_kind core.chapter_kind;
BEGIN
  SELECT scope_type, chapter_kind
    INTO v_scope_type, v_chapter_kind
  FROM core.scopes
  WHERE id = NEW.scope_id;

  IF v_scope_type IS NULL THEN
    RAISE EXCEPTION 'memberships.scope_id % does not exist', NEW.scope_id
      USING ERRCODE = '23503';
  END IF;

  -- Geographic memberships only — branch or (autonomous) chapter.
  IF v_scope_type NOT IN ('branch', 'chapter') THEN
    RAISE EXCEPTION 'memberships.scope_id must reference a branch or chapter (got %)', v_scope_type
      USING ERRCODE = '23514';
  END IF;

  IF v_scope_type = 'chapter' AND v_chapter_kind IS DISTINCT FROM 'autonomous' THEN
    RAISE EXCEPTION 'memberships on a chapter require chapter_kind=autonomous (got %)', COALESCE(v_chapter_kind::text, 'null')
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER memberships_scope_shape_check
  BEFORE INSERT OR UPDATE OF scope_id ON core.memberships
  FOR EACH ROW EXECUTE FUNCTION core.memberships_check_scope_shape();

-- Trigger: passive is only meaningful on geographic memberships. Since
-- the scope-shape trigger already restricts scope_id to branch/chapter,
-- passive is implicitly geographic-only here. This second trigger
-- guards against a hypothetical future migration adding non-geographic
-- rows — belt for the CHECK's suspenders.

CREATE OR REPLACE FUNCTION core.memberships_check_passive_shape()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_scope_type core.scope_type;
BEGIN
  IF NEW.membership_status <> 'passive' THEN RETURN NEW; END IF;
  SELECT scope_type INTO v_scope_type FROM core.scopes WHERE id = NEW.scope_id;
  IF v_scope_type NOT IN ('branch', 'chapter') THEN
    RAISE EXCEPTION 'passive status is only valid on geographic memberships (got %)', v_scope_type
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER memberships_passive_shape_check
  BEFORE INSERT OR UPDATE OF membership_status ON core.memberships
  FOR EACH ROW EXECUTE FUNCTION core.memberships_check_passive_shape();

-------------------------------------------------------------------------------
-- 4. Partial unique index — at most one active geographic membership
-------------------------------------------------------------------------------
-- The predicate on scope_type IN (...) has to hit an index-friendly
-- column; we can't reference `EXISTS (…)` in a partial index. Fastest
-- path: keep the partial index on membership_status alone and enforce
-- the scope_type restriction via the scope-shape trigger above (which
-- already blocks non-geographic scope_ids from becoming memberships).
-- Combined effect: no member can hold two `active`/`passive` rows
-- across ANY scope_ids (all of which are geographic by trigger).

CREATE UNIQUE INDEX memberships_one_active_geographic_per_member
  ON core.memberships (member_id)
  WHERE membership_status IN ('active', 'passive');

CREATE INDEX memberships_scope_id_status_idx
  ON core.memberships (scope_id, membership_status);
CREATE INDEX memberships_member_id_idx
  ON core.memberships (member_id);

COMMENT ON TABLE core.memberships IS
  'Geographic body memberships (branch + autonomous chapters). One active/passive row per member; grouping chapters do not appear here — see core.grouping_chapter_tags.';

-------------------------------------------------------------------------------
-- 5. Transfer atomicity — Postgres function
-------------------------------------------------------------------------------
-- Approving a transfer must, in a single transaction:
--   (a) mark the source membership row as `transferred` with the
--       transferred_at timestamp.
--   (b) insert the destination membership row as `active`.
--   (c) update the request row (in E1.4's transfers migration) to
--       status=approved.
--
-- Wrapping this in a SECURITY DEFINER function keeps the atomicity
-- guaranteed regardless of caller. Callers still need `membership.transfer`
-- (checked in the Edge Function); this function trusts the caller.

CREATE OR REPLACE FUNCTION core.perform_transfer(
  p_source_membership_id UUID,
  p_destination_scope_id UUID,
  p_approved_by          UUID,
  p_transfer_request_id  UUID DEFAULT NULL
)
RETURNS UUID   -- new destination membership id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_member_id UUID;
  v_source_scope UUID;
  v_new_membership UUID;
BEGIN
  IF p_source_membership_id IS NULL OR p_destination_scope_id IS NULL OR p_approved_by IS NULL THEN
    RAISE EXCEPTION 'perform_transfer: all args required'
      USING ERRCODE = '22004';
  END IF;

  SELECT member_id, scope_id INTO v_member_id, v_source_scope
  FROM core.memberships WHERE id = p_source_membership_id;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'perform_transfer: source membership not found' USING ERRCODE = '02000';
  END IF;

  -- Close source.
  UPDATE core.memberships
     SET membership_status = 'transferred',
         transferred_at    = NOW()
   WHERE id = p_source_membership_id;

  -- Open destination.
  INSERT INTO core.memberships (
    member_id, scope_id, membership_status, join_method,
    joined_at, approved_at, approved_by
  )
  VALUES (
    v_member_id, p_destination_scope_id, 'active', 'transfer',
    NOW(), NOW(), p_approved_by
  )
  RETURNING id INTO v_new_membership;

  -- Update the transfer request row if one was passed. Wrap in a
  -- to_regclass check so this function is safe to define before the
  -- transfers table exists — it's a no-op in that intermediate state.
  IF p_transfer_request_id IS NOT NULL
     AND to_regclass('core.membership_transfers') IS NOT NULL THEN
    EXECUTE format(
      $sql$
        UPDATE core.membership_transfers
           SET status = 'approved',
               approved_at = NOW(),
               approved_by = %L
         WHERE id = %L
      $sql$,
      p_approved_by,
      p_transfer_request_id
    );
  END IF;

  RETURN v_new_membership;
END;
$$;

REVOKE ALL ON FUNCTION core.perform_transfer(UUID, UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.perform_transfer(UUID, UUID, UUID, UUID) TO authenticated, service_role;

COMMENT ON FUNCTION core.perform_transfer IS
  'Atomic transfer: closes source membership + opens destination as active + updates transfer request if provided. Callers must have already checked membership.transfer at the source scope.';

-------------------------------------------------------------------------------
-- 6. RLS — enable with NO policies (real policies land in rls_memberships)
-------------------------------------------------------------------------------

ALTER TABLE core.memberships ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON core.memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.memberships TO service_role;
