-- Migration: member_read_pending_and_attribute
--
-- Two RLS gaps surfaced in the 2026-07-03 walkthrough:
--
-- 1. A branch admin reviewing pending join requests couldn't see the
--    requesters' names/emails because `core.can_read_member_via_membership`
--    only accepted `active` or `passive` memberships. The Requests panel
--    rendered every row as "(missing)" for that reason.
--
--    Fix: include `'pending'` in the status filter. The scope check
--    (has_permission at the target scope) still gates access — a
--    non-admin at Buea can't read pending members at Buea, they just
--    can't see across into other scopes' pending members either.
--
-- 2. A batch admin (or, later, a house/network admin) couldn't read the
--    members attached to their scope because members join via
--    attribute columns (`batch_scope_id`, `house_scope_id`,
--    `network_scope_id`) — there's no membership row at a batch. The
--    existing SELECT policy only had a via-membership path and a
--    global mainstream-scope path.
--
--    Fix: add `core.can_read_member_via_attribute(member_id, user_id)`
--    that returns TRUE when the caller has `member.read` at any of the
--    member's three attribute scopes, and OR-it into the SELECT policy.
--
-- Both changes preserve the existing invariants: no cross-scope leaks,
-- self-owned members always visible, mainstream_admin unchanged.

-------------------------------------------------------------------------------
-- 1. Extend can_read_member_via_membership to include pending
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.can_read_member_via_membership(
  p_member_id UUID,
  p_user_id   UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_hit BOOLEAN;
BEGIN
  IF p_member_id IS NULL OR p_user_id IS NULL THEN RETURN FALSE; END IF;

  SELECT EXISTS (
    SELECT 1
    FROM core.memberships m
    WHERE m.member_id = p_member_id
      -- 'pending' added 2026-07-03 so admins approving join requests
      -- can see the requester's name/email in the queue.
      AND m.membership_status IN ('active', 'passive', 'pending')
      AND core.has_permission(p_user_id, m.scope_id, 'member.read')
  )
  INTO v_hit;

  RETURN COALESCE(v_hit, FALSE);
END;
$$;

COMMENT ON FUNCTION core.can_read_member_via_membership(UUID, UUID) IS
  'Returns TRUE if the caller has member.read at any scope where the target member holds an active / passive / pending membership. Pending is included so admins can see the members behind join-request queues.';

-------------------------------------------------------------------------------
-- 2. Add can_read_member_via_attribute for batch/house/network reads
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.can_read_member_via_attribute(
  p_member_id UUID,
  p_user_id   UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_batch    UUID;
  v_house    UUID;
  v_network  UUID;
BEGIN
  IF p_member_id IS NULL OR p_user_id IS NULL THEN RETURN FALSE; END IF;

  SELECT batch_scope_id, house_scope_id, network_scope_id
    INTO v_batch, v_house, v_network
  FROM core.members
  WHERE id = p_member_id;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  RETURN
    (v_batch   IS NOT NULL AND core.has_permission(p_user_id, v_batch,   'member.read')) OR
    (v_house   IS NOT NULL AND core.has_permission(p_user_id, v_house,   'member.read')) OR
    (v_network IS NOT NULL AND core.has_permission(p_user_id, v_network, 'member.read'));
END;
$$;

COMMENT ON FUNCTION core.can_read_member_via_attribute(UUID, UUID) IS
  'Returns TRUE if the caller has member.read at the member''s batch, house, or network scope. Complements can_read_member_via_membership for scope types (batch/house/network) that link members by attribute rather than by membership row.';

-------------------------------------------------------------------------------
-- 3. Extend the members SELECT policy to include the attribute path
-------------------------------------------------------------------------------
-- The existing policy is:
--   member_owned_by(id, auth.uid()) OR
--   has_permission(auth.uid(), mainstream_scope_id(), 'member.read') OR
--   can_read_member_via_membership(id, auth.uid())
--
-- Adds one more OR-clause: can_read_member_via_attribute(id, auth.uid()).

DROP POLICY IF EXISTS members_select ON core.members;

CREATE POLICY members_select ON core.members
  FOR SELECT
  TO authenticated
  USING (
    core.member_owned_by(id, auth.uid())
    OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.read')
    OR core.can_read_member_via_membership(id, auth.uid())
    OR core.can_read_member_via_attribute(id, auth.uid())
  );
