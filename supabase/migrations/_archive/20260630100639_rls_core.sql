-- Migration: rls_core
--
-- Enables RLS policies on every table in the `core` schema. RLS is
-- already ON for these tables (the table-creation migrations call
-- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) — without a policy, the
-- default is DENY for authenticated/anon. This migration adds the
-- explicit ALLOW policies.
--
-- The two-layer model (ADR-0006):
--   - RLS is the always-on primary line. The functions in this file are
--     the SQL-side checks every direct supabase-js read/write passes
--     through.
--   - Server Actions / Edge Functions add a second layer (policy module
--     + error envelope) so a denied operation surfaces as a clean
--     FORBIDDEN error, not "0 rows returned" silence.
--
-- Recursion safety: every policy that needs the permission check calls
-- `core.has_permission` (or `core.can_view_role_history`). Both are
-- SECURITY DEFINER with a pinned search_path — they bypass RLS on the
-- RBAC tables they consult, so policies on `core.role_assignments` that
-- call `has_permission` (which internally queries `role_assignments`)
-- terminate cleanly. See E3's `init_core_permission_checker` for why.

-------------------------------------------------------------------------------
-- 1. Reference helper for role_history reads
-------------------------------------------------------------------------------
-- core.role_history doesn't carry scope_id directly (the FK to
-- role_assignments holds it). The policy needs to resolve the
-- assignment's scope_id first, then call has_permission against it.
-- Wrap that in a SECURITY DEFINER helper so the policy stays one
-- function call, and so the lookup against role_assignments isn't
-- itself subject to RLS recursion.

CREATE OR REPLACE FUNCTION core.can_view_role_history(p_role_assignment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
STABLE
AS $$
DECLARE
  v_scope_id UUID;
  v_user_id  UUID;
BEGIN
  IF p_role_assignment_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT scope_id, user_id
    INTO v_scope_id, v_user_id
  FROM core.role_assignments
  WHERE id = p_role_assignment_id;

  -- Subject of the assignment can always see their own history.
  -- audit.read holders see history at the assignment's scope (and
  -- ancestors via has_permission's traversal).
  RETURN v_user_id = auth.uid()
      OR core.has_permission(auth.uid(), v_scope_id, 'audit.read');
END;
$$;

REVOKE ALL ON FUNCTION core.can_view_role_history(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.can_view_role_history(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION core.can_view_role_history IS
  'RLS helper for core.role_history SELECT. Returns TRUE if the caller is the assignment subject OR has audit.read at the assignment scope.';

-------------------------------------------------------------------------------
-- 2. core.profiles — own-row access only in Phase 0
-------------------------------------------------------------------------------
-- Broader member-directory visibility (other members can see profiles
-- in shared scopes) is a Phase 1 concern when the actual memberships
-- table lands. For now, users see and edit only their own profile.

CREATE POLICY profiles_select_own ON core.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY profiles_insert_own ON core.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_own ON core.profiles
  FOR UPDATE TO authenticated
  USING      (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No DELETE policy: profiles are soft-deactivated, never hard-deleted.

-------------------------------------------------------------------------------
-- 3. core.scopes + core.scope_capabilities — open SELECT for authenticated
-------------------------------------------------------------------------------
-- The org chart is reference data: members need to know which Branches /
-- Chapters / Batches exist to do anything in the UI (filters, navigation,
-- "transfer to" dropdowns, etc.). Hiding the catalog forces a separate
-- RPC and buys nothing — the names of public Branches are not sensitive.
--
-- All mutations stay closed: scope create/edit/disable is a Server
-- Action / Edge Function path that uses the service-role client and
-- checks scope.manage explicitly. Closing mutations here means a
-- compromised authenticated session cannot reshape the org tree.

CREATE POLICY scopes_select_authenticated ON core.scopes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY scope_capabilities_select_authenticated ON core.scope_capabilities
  FOR SELECT TO authenticated
  USING (true);

-------------------------------------------------------------------------------
-- 4. core.roles / core.permissions / core.role_permissions — reference data
-------------------------------------------------------------------------------
-- These three tables hold the system catalog: the seven roles, the
-- thirteen permissions, the role→permission bundles. Authenticated
-- users can read them (so apps can render role badges, permission
-- pickers, etc.) but cannot mutate. Catalog changes go via SQL
-- migrations + seed.sql.

CREATE POLICY roles_select_authenticated ON core.roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY permissions_select_authenticated ON core.permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY role_permissions_select_authenticated ON core.role_permissions
  FOR SELECT TO authenticated
  USING (true);

-------------------------------------------------------------------------------
-- 5. core.role_assignments — the heart of the access model
-------------------------------------------------------------------------------
-- Visibility:
--   - You always see your own assignments (so the UI can render "your
--     roles at Branch X" without a privileged call).
--   - You see all assignments at scopes where you have role.grant,
--     role.revoke, or audit.read (so the governance UI works for
--     admins). has_permission's ancestry traversal covers descendants
--     via your role at a higher scope.
--
-- Mutations:
--   - INSERT requires role.grant at the target scope (so you can grant
--     where you have grant authority — admin granting at their Branch).
--   - UPDATE requires role.revoke at the target scope (the only
--     legitimate UPDATE is setting revoked_at; the audit trigger on
--     role_assignments captures the change to core.role_history +
--     audit.audit_entries automatically).
--   - DELETE is denied entirely — revocation goes through UPDATE so
--     the history trail is preserved.

CREATE POLICY role_assignments_select ON core.role_assignments
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR core.has_permission(auth.uid(), scope_id, 'role.grant')
    OR core.has_permission(auth.uid(), scope_id, 'role.revoke')
    OR core.has_permission(auth.uid(), scope_id, 'audit.read')
  );

CREATE POLICY role_assignments_insert ON core.role_assignments
  FOR INSERT TO authenticated
  WITH CHECK (core.has_permission(auth.uid(), scope_id, 'role.grant'));

CREATE POLICY role_assignments_update ON core.role_assignments
  FOR UPDATE TO authenticated
  USING      (core.has_permission(auth.uid(), scope_id, 'role.revoke'))
  WITH CHECK (core.has_permission(auth.uid(), scope_id, 'role.revoke'));

-- No DELETE policy.

-------------------------------------------------------------------------------
-- 6. core.role_history — read-only timeline
-------------------------------------------------------------------------------
-- The history table is written exclusively by the audit trigger on
-- core.role_assignments (SECURITY DEFINER, bypasses RLS). Direct
-- INSERT from the client is not a use case; UPDATE/DELETE are blocked
-- by the append-only trigger from E4. So we only need a SELECT policy
-- here.

CREATE POLICY role_history_select ON core.role_history
  FOR SELECT TO authenticated
  USING (core.can_view_role_history(role_assignment_id));

-- No INSERT/UPDATE/DELETE policies — RLS default-deny + the append-only
-- trigger from E4 are the layers that close those operations.
