-- Migration: init_core_permission_checker
--
-- The two functions every authorization decision in Shesa funnels
-- through:
--
--   core.has_permission(user, scope, permission_key) → boolean
--   core.get_user_permissions(user, scope) → set of permission_keys
--
-- They:
--   1. Walk UP the scope hierarchy from `p_scope_id`, collecting every
--      ancestor that the user's role assignments could grant authority
--      at. Traversal STOPS at autonomous scopes — a Mainstream admin's
--      permissions do not reach into an autonomous Branch (per ADR-0007).
--   2. Join active role assignments (non-revoked, within lifecycle window)
--      against role_permissions against the permissions catalog.
--   3. Return TRUE if any path grants the requested permission.
--
-- SECURITY DEFINER + pinned search_path:
--   The functions run as their OWNER (the postgres role), which bypasses
--   RLS on the underlying tables. WITHOUT bypass, calling these from
--   inside an RLS policy on `core.role_assignments` would recurse and
--   deadlock — see the plan's E3 verify step.
--   `search_path` is pinned so a hostile schema can't inject objects
--   that shadow the ones we resolve (the classic SECURITY DEFINER
--   privilege-escalation pattern).
--
-- Self-introspection guard:
--   Authenticated callers may only ask about THEIR OWN permissions
--   (auth.uid() must equal p_user_id). Server roles (service_role)
--   bypass this — Server Actions / Edge Functions check other users
--   legitimately. Without the guard, any authenticated user could
--   enumerate every other user's role grants by polling has_permission.

-------------------------------------------------------------------------------
-- 1. has_permission
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.has_permission(
  p_user_id        UUID,
  p_scope_id       UUID,
  p_permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
STABLE
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  -- Guard: authenticated callers can only check their own permissions.
  -- service_role / postgres / supabase_admin bypass this. auth.role()
  -- reads the JWT claim, which is still set inside SECURITY DEFINER.
  IF p_user_id IS DISTINCT FROM auth.uid()
     AND COALESCE(auth.role(), '') NOT IN ('service_role', 'supabase_admin')
  THEN
    RAISE EXCEPTION 'has_permission: cannot check another user''s permissions'
      USING ERRCODE = '42501',
            HINT = 'auth.uid() does not match p_user_id; only service_role may probe other users.';
  END IF;

  -- Null inputs short-circuit to FALSE rather than throwing — this lets
  -- callers pass through optional scope refs without pre-guarding.
  IF p_user_id IS NULL OR p_scope_id IS NULL OR p_permission_key IS NULL THEN
    RETURN FALSE;
  END IF;

  WITH RECURSIVE scope_ancestry AS (
    -- The target scope itself is always in the ancestry, regardless of
    -- its own autonomy flag. (Autonomy gates inheritance FROM the parent,
    -- not the scope's own grants.)
    SELECT s.id, s.parent_scope_id, s.is_autonomous
    FROM core.scopes s
    WHERE s.id = p_scope_id

    UNION ALL

    -- Walk to the parent only if the CURRENT scope in the ancestry is
    -- not autonomous. An autonomous scope means "I don't inherit from
    -- my parent" — so we stop walking up at the autonomous boundary.
    SELECT s.id, s.parent_scope_id, s.is_autonomous
    FROM core.scopes s
    INNER JOIN scope_ancestry a ON s.id = a.parent_scope_id
    WHERE NOT a.is_autonomous
  )
  SELECT EXISTS (
    SELECT 1
    FROM core.role_assignments ra
    INNER JOIN core.role_permissions rp ON rp.role_id = ra.role_id
    INNER JOIN core.permissions p        ON p.id      = rp.permission_id
    INNER JOIN scope_ancestry sa         ON sa.id     = ra.scope_id
    WHERE ra.user_id = p_user_id
      AND p.key     = p_permission_key
      -- Lifecycle filter: active, non-revoked, within window.
      AND ra.revoked_at IS NULL
      AND ra.starts_at <= NOW()
      AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
  ) INTO v_result;

  RETURN COALESCE(v_result, FALSE);
END;
$$;

COMMENT ON FUNCTION core.has_permission(UUID, UUID, TEXT) IS
  'Returns TRUE if the user has the named permission at the scope (or any non-autonomous ancestor). SECURITY DEFINER bypasses RLS on the RBAC tables. Self-introspection guarded: authenticated callers can only check their own user_id.';

-------------------------------------------------------------------------------
-- 2. get_user_permissions
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.get_user_permissions(
  p_user_id  UUID,
  p_scope_id UUID
)
RETURNS TABLE (permission_key TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
STABLE
AS $$
BEGIN
  -- Same self-introspection guard as has_permission.
  IF p_user_id IS DISTINCT FROM auth.uid()
     AND COALESCE(auth.role(), '') NOT IN ('service_role', 'supabase_admin')
  THEN
    RAISE EXCEPTION 'get_user_permissions: cannot list another user''s permissions'
      USING ERRCODE = '42501',
            HINT = 'auth.uid() does not match p_user_id; only service_role may probe other users.';
  END IF;

  IF p_user_id IS NULL OR p_scope_id IS NULL THEN
    RETURN; -- empty set
  END IF;

  RETURN QUERY
  WITH RECURSIVE scope_ancestry AS (
    SELECT s.id, s.parent_scope_id, s.is_autonomous
    FROM core.scopes s
    WHERE s.id = p_scope_id

    UNION ALL

    SELECT s.id, s.parent_scope_id, s.is_autonomous
    FROM core.scopes s
    INNER JOIN scope_ancestry a ON s.id = a.parent_scope_id
    WHERE NOT a.is_autonomous
  )
  SELECT DISTINCT p.key
  FROM core.role_assignments ra
  INNER JOIN core.role_permissions rp ON rp.role_id = ra.role_id
  INNER JOIN core.permissions p        ON p.id      = rp.permission_id
  INNER JOIN scope_ancestry sa         ON sa.id     = ra.scope_id
  WHERE ra.user_id = p_user_id
    AND ra.revoked_at IS NULL
    AND ra.starts_at <= NOW()
    AND (ra.ends_at IS NULL OR ra.ends_at > NOW());
END;
$$;

COMMENT ON FUNCTION core.get_user_permissions(UUID, UUID) IS
  'Returns the distinct set of permission keys a user has at the scope (via roles granted there or in non-autonomous ancestors). Use for resolving "effective permissions" once; use has_permission for single-permission checks.';

-------------------------------------------------------------------------------
-- 3. EXECUTE grants
-------------------------------------------------------------------------------
-- SECURITY DEFINER means the BODY runs as the owner, but the CALLER
-- still needs EXECUTE to invoke the function. Grant to authenticated +
-- service_role; explicitly revoke from public + anon so a misconfigured
-- client can't probe.

REVOKE ALL ON FUNCTION core.has_permission(UUID, UUID, TEXT)        FROM PUBLIC;
REVOKE ALL ON FUNCTION core.get_user_permissions(UUID, UUID)        FROM PUBLIC;

GRANT EXECUTE ON FUNCTION core.has_permission(UUID, UUID, TEXT)     TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION core.get_user_permissions(UUID, UUID)     TO authenticated, service_role;
