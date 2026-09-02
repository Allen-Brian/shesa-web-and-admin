-- Migration: member_transfer_and_membership_attribute_reads
--
-- Two more RLS gaps from the walkthrough:
--
-- 1. The Transfers panel showed no name / email / batch for the incoming
--    transfers even though the panel itself listed 5 rows. Root cause:
--    a member with a pending transfer TO Buea has their ONLY active
--    membership at the SOURCE (Douala). Buea admin has `member.read` at
--    Buea only. `can_read_member_via_membership` walks the member's
--    memberships and asks "does the caller have member.read at any of
--    them?" — none of Douala/DC scopes match, so it returns FALSE and
--    the fetch reveals nothing.
--
--    Fix: `core.can_read_member_via_transfer` — TRUE when the caller
--    has member.read at the destination of a pending transfer for
--    that member. Added as an OR-clause on the members SELECT policy.
--
-- 2. Batch admin viewing their batch's members saw '—' in Branch,
--    Membership, and Engagement columns. Root cause: `core.memberships`
--    SELECT policy only permits reads when the caller has `member.read`
--    at the membership's scope. A batch admin has member.read at
--    batch-2012, not at Buea / Douala / DC — so the memberships at
--    those scopes are hidden.
--
--    Fix: `core.can_read_membership_via_member_attribute` — TRUE when
--    the caller has member.read at any of the member's attribute
--    scopes (batch, house, or network). Added as an OR-clause on the
--    memberships SELECT policy. A batch admin can now read the
--    memberships of any member in their batch, regardless of which
--    branch that member is currently at. This is read-only; write
--    paths stay gated on the membership's scope.

-------------------------------------------------------------------------------
-- 1. can_read_member_via_transfer — for the Transfers queue view
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.can_read_member_via_transfer(
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
    FROM core.membership_transfers t
    WHERE t.member_id = p_member_id
      AND t.status = 'pending'
      AND (
        core.has_permission(p_user_id, t.destination_scope_id, 'member.read')
        OR core.has_permission(p_user_id, t.source_scope_id, 'member.read')
      )
  )
  INTO v_hit;

  RETURN COALESCE(v_hit, FALSE);
END;
$$;

COMMENT ON FUNCTION core.can_read_member_via_transfer(UUID, UUID) IS
  'Returns TRUE if the caller has member.read at either the source or destination of a pending transfer for the member. Enables destination-scope admins to see the requesters in their Transfers queue (2026-07-03 flip: destination approves).';

-------------------------------------------------------------------------------
-- 2. Extend the members SELECT policy with the transfer path
-------------------------------------------------------------------------------

DROP POLICY IF EXISTS members_select ON core.members;

CREATE POLICY members_select ON core.members
  FOR SELECT
  TO authenticated
  USING (
    core.member_owned_by(id, auth.uid())
    OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.read')
    OR core.can_read_member_via_membership(id, auth.uid())
    OR core.can_read_member_via_attribute(id, auth.uid())
    OR core.can_read_member_via_transfer(id, auth.uid())
  );

-------------------------------------------------------------------------------
-- 3. can_read_membership_via_member_attribute — for batch/house/network views
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.can_read_membership_via_member_attribute(
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

COMMENT ON FUNCTION core.can_read_membership_via_member_attribute(UUID, UUID) IS
  'Returns TRUE if the caller has member.read at any of the target membership''s member''s attribute scopes (batch/house/network). Grants read visibility on a member''s memberships to admins at the member''s batch / house / network without granting write access.';

-------------------------------------------------------------------------------
-- 4. Extend the memberships SELECT policy with the attribute path
-------------------------------------------------------------------------------

DROP POLICY IF EXISTS memberships_select ON core.memberships;

CREATE POLICY memberships_select ON core.memberships
  FOR SELECT
  TO authenticated
  USING (
    core.membership_owned_by(id, auth.uid())
    OR core.has_permission(auth.uid(), scope_id, 'member.read')
    OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.read')
    OR core.can_read_membership_via_member_attribute(member_id, auth.uid())
  );
