-- Migration: rls_members
--
-- RLS on core.members + core.member_accounts.
--
-- Phase 1 slice — the plan calls for three SELECT clauses on
-- core.members:
--   (a) the user owns the linked account,
--   (b) they hold member.read at any scope containing the member's
--       active memberships,
--   (c) they hold member.read at Mainstream.
--
-- Clause (b) needs `core.memberships` which doesn't exist yet (E1.4).
-- We ship (a) and (c) here, and extend (b) in E1.4's migration once
-- the memberships table is available. This gives us a **safe default**
-- for E1.2/E1.3 landings — nobody sees another member's row unless
-- they're a Mainstream-level reader (which is the coarser existing
-- category anyway).
--
-- INSERT + UPDATE routes through Edge Functions under the caller's
-- JWT; RLS is the second line of defense. Both are gated by
-- `member.create` / `member.update` at Mainstream (or an ancestor via
-- has_permission).

-------------------------------------------------------------------------------
-- 1. Helper: does a user own a given member row?
-------------------------------------------------------------------------------
-- Called by SELECT policy on core.members. SECURITY DEFINER + pinned
-- search_path — same discipline as has_permission — so the join to
-- core.member_accounts doesn't recurse into RLS on that table (which
-- would loop the policy back onto itself).

CREATE OR REPLACE FUNCTION core.member_owned_by(p_member_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
STABLE
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  IF p_member_id IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM core.member_accounts ma
    WHERE ma.member_id = p_member_id
      AND ma.auth_user_id = p_user_id
      AND ma.claim_status = 'claimed'
  ) INTO v_exists;
  RETURN COALESCE(v_exists, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION core.member_owned_by(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.member_owned_by(UUID, UUID) TO authenticated, service_role;

COMMENT ON FUNCTION core.member_owned_by IS
  'RLS helper: does user own the member row via core.member_accounts? SECURITY DEFINER so the join to member_accounts doesn''t recurse into that table''s RLS.';

-------------------------------------------------------------------------------
-- 2. Mainstream scope id — resolved once, cached in a STABLE function
-------------------------------------------------------------------------------
-- Every "does the user hold X at Mainstream" policy needs the mainstream
-- scope id. Rather than hard-coding it (fine for local seed, wrong for
-- prod which may seed a different UUID) look it up in a helper that
-- caches within a query.

CREATE OR REPLACE FUNCTION core.mainstream_scope_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
  SELECT id FROM core.scopes WHERE scope_type = 'mainstream' LIMIT 1;
$$;

REVOKE ALL ON FUNCTION core.mainstream_scope_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.mainstream_scope_id() TO authenticated, service_role;

-------------------------------------------------------------------------------
-- 3. core.members policies
-------------------------------------------------------------------------------

-- SELECT: owner of the linked account, OR anyone with member.read at
-- Mainstream. Clause (b) — "member.read at any scope containing an
-- active membership" — lands in E1.4 when memberships exists.
CREATE POLICY members_select ON core.members
  FOR SELECT TO authenticated
  USING (
    core.member_owned_by(id, auth.uid())
    OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.read')
  );

-- INSERT: caller must have member.create at Mainstream (or ancestor).
-- The Edge Function pre-checks this too — RLS is the backstop.
CREATE POLICY members_insert ON core.members
  FOR INSERT TO authenticated
  WITH CHECK (
    core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.create')
  );

-- UPDATE: two disjoint paths.
--   * The member themselves can UPDATE their own row (an app-layer
--     column filter prevents non-editable fields from being written —
--     see update-member Edge Function). RLS itself can't restrict
--     which columns get set, so the Edge Function's field-level check
--     is the primary control; RLS confirms the target row.
--   * An admin with member.update at Mainstream can UPDATE any row.
CREATE POLICY members_update ON core.members
  FOR UPDATE TO authenticated
  USING (
    core.member_owned_by(id, auth.uid())
    OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.update')
  )
  WITH CHECK (
    core.member_owned_by(id, auth.uid())
    OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.update')
  );

-- No DELETE policy — members are never hard-deleted; the deceased path
-- flips member_status and the E1.4 trigger cascades memberships. Even
-- service_role should push through admin.log flows rather than raw
-- DELETE.

-------------------------------------------------------------------------------
-- 4. core.member_accounts policies
-------------------------------------------------------------------------------

-- SELECT: user reads their own account row; admins with member.manage
-- at Mainstream read any (E1.4 refines to per-membership-scope).
CREATE POLICY member_accounts_select ON core.member_accounts
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.manage')
  );

-- INSERT: the Edge Function creates account rows using the service-role
-- (it needs to set auth_user_id after user creation), but for defense
-- in depth, restrict authenticated INSERT to member.manage holders.
CREATE POLICY member_accounts_insert ON core.member_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.manage')
  );

-- UPDATE: admin flips claim_status / auth_user_id. The user themselves
-- has no reason to UPDATE this row.
CREATE POLICY member_accounts_update ON core.member_accounts
  FOR UPDATE TO authenticated
  USING (
    core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.manage')
  )
  WITH CHECK (
    core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.manage')
  );
