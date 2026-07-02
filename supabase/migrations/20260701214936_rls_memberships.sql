-- Migration: rls_memberships
--
-- RLS on the four E1.4 tables:
--
--   core.memberships                — SELECT for the member themselves
--                                     OR anyone with member.read at the
--                                     membership's scope; INSERT/UPDATE
--                                     for membership.approve/transfer/
--                                     mark_passive holders at the scope.
--   core.membership_transfers       — SELECT for the member OR anyone
--                                     with membership.transfer at either
--                                     source or destination scope.
--   core.grouping_chapter_tags      — SELECT for the member OR anyone
--                                     with member.read at the parent
--                                     branch scope.
--   core.registration_status        — SELECT for the member OR anyone
--                                     with member.read at the
--                                     membership's scope.
--
-- Every INSERT/UPDATE gate goes through core.has_permission — the same
-- SECURITY DEFINER path E1.1's plan-driven "predicates written as
-- (scope_id IS NULL OR scope_id = X)" pattern set up.

-------------------------------------------------------------------------------
-- 1. Helper: does the caller own the given membership row?
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.membership_owned_by(p_membership_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
STABLE
AS $$
DECLARE
  v_hit BOOLEAN;
BEGIN
  IF p_membership_id IS NULL OR p_user_id IS NULL THEN RETURN FALSE; END IF;
  SELECT EXISTS (
    SELECT 1
    FROM core.memberships m
    INNER JOIN core.member_accounts ma ON ma.member_id = m.member_id
    WHERE m.id = p_membership_id
      AND ma.auth_user_id = p_user_id
      AND ma.claim_status = 'claimed'
  ) INTO v_hit;
  RETURN COALESCE(v_hit, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION core.membership_owned_by(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.membership_owned_by(UUID, UUID) TO authenticated, service_role;

-------------------------------------------------------------------------------
-- 2. core.memberships policies
-------------------------------------------------------------------------------

CREATE POLICY memberships_select ON core.memberships
  FOR SELECT TO authenticated
  USING (
    core.membership_owned_by(id, auth.uid())
    OR core.has_permission(auth.uid(), scope_id, 'member.read')
    OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.read')
  );

-- INSERT: any of the lifecycle permissions at the target scope work.
-- Concretely: membership.approve (admin-added active), membership.transfer
-- (destination via transfer), or member.create at Mainstream (Excel import).
CREATE POLICY memberships_insert ON core.memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    core.has_permission(auth.uid(), scope_id, 'membership.approve')
    OR core.has_permission(auth.uid(), scope_id, 'membership.transfer')
    OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.create')
  );

-- UPDATE: approve / reject / passive / transferred flips.
CREATE POLICY memberships_update ON core.memberships
  FOR UPDATE TO authenticated
  USING (
    core.has_permission(auth.uid(), scope_id, 'membership.approve')
    OR core.has_permission(auth.uid(), scope_id, 'membership.reject')
    OR core.has_permission(auth.uid(), scope_id, 'membership.mark_passive')
    OR core.has_permission(auth.uid(), scope_id, 'membership.transfer')
  )
  WITH CHECK (
    core.has_permission(auth.uid(), scope_id, 'membership.approve')
    OR core.has_permission(auth.uid(), scope_id, 'membership.reject')
    OR core.has_permission(auth.uid(), scope_id, 'membership.mark_passive')
    OR core.has_permission(auth.uid(), scope_id, 'membership.transfer')
  );

-------------------------------------------------------------------------------
-- 3. core.membership_transfers policies
-------------------------------------------------------------------------------

CREATE POLICY transfers_select ON core.membership_transfers
  FOR SELECT TO authenticated
  USING (
    core.has_permission(auth.uid(), source_scope_id, 'membership.transfer')
    OR core.has_permission(auth.uid(), destination_scope_id, 'membership.transfer')
    OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.read')
    -- Member themselves — via member_owned_by on the linked member row.
    OR core.member_owned_by(member_id, auth.uid())
  );

CREATE POLICY transfers_insert ON core.membership_transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    core.has_permission(auth.uid(), source_scope_id, 'membership.transfer')
  );

CREATE POLICY transfers_update ON core.membership_transfers
  FOR UPDATE TO authenticated
  USING (
    core.has_permission(auth.uid(), source_scope_id, 'membership.transfer')
    OR core.has_permission(auth.uid(), destination_scope_id, 'membership.transfer')
  )
  WITH CHECK (
    core.has_permission(auth.uid(), source_scope_id, 'membership.transfer')
    OR core.has_permission(auth.uid(), destination_scope_id, 'membership.transfer')
  );

-------------------------------------------------------------------------------
-- 4. core.grouping_chapter_tags policies
-------------------------------------------------------------------------------

CREATE POLICY grouping_tags_select ON core.grouping_chapter_tags
  FOR SELECT TO authenticated
  USING (
    core.has_permission(auth.uid(), parent_branch_scope_id, 'member.read')
    OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.read')
    OR core.member_owned_by(member_id, auth.uid())
  );

CREATE POLICY grouping_tags_insert ON core.grouping_chapter_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    core.has_permission(auth.uid(), parent_branch_scope_id, 'membership.approve')
  );

CREATE POLICY grouping_tags_update ON core.grouping_chapter_tags
  FOR UPDATE TO authenticated
  USING (
    core.has_permission(auth.uid(), parent_branch_scope_id, 'membership.approve')
  )
  WITH CHECK (
    core.has_permission(auth.uid(), parent_branch_scope_id, 'membership.approve')
  );

-------------------------------------------------------------------------------
-- 5. core.registration_status policies
-------------------------------------------------------------------------------

CREATE POLICY registration_select ON core.registration_status
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core.memberships m
      WHERE m.id = registration_status.membership_id
    )
  );

CREATE POLICY registration_insert ON core.registration_status
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM core.memberships m
      WHERE m.id = registration_status.membership_id
        AND core.has_permission(auth.uid(), m.scope_id, 'registration.mark_paid')
    )
  );

CREATE POLICY registration_update ON core.registration_status
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core.memberships m
      WHERE m.id = registration_status.membership_id
        AND core.has_permission(auth.uid(), m.scope_id, 'registration.mark_paid')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM core.memberships m
      WHERE m.id = registration_status.membership_id
        AND core.has_permission(auth.uid(), m.scope_id, 'registration.mark_paid')
    )
  );
