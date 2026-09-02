-- Migration: init_core_get_user_grants
--
-- Adds `core.get_user_grants(uuid)` — the bootstrap query the Vite
-- SPA calls once on mount (through the `get-my-grants` Edge Function)
-- to hydrate a permission cache that drives sidebar visibility and
-- optimistic route guards.
--
-- Why not `core.get_user_permissions`? That function is SCOPED — it
-- resolves effective permissions AT a specific scope, walking scope
-- ancestry. Useful for one-off "can I do X here" checks. But the
-- sidebar's question is different: "for every scope I have a grant
-- at, what role and permission set applies?" — a bootstrap enumerating
-- the direct grants themselves, one row per (scope, role). The SPA
-- then computes ancestry lookups on the client for optimistic render;
-- the authoritative check remains `core.has_permission` at the Edge
-- Function boundary for every write (ADR-0035 §Consequences).
--
-- SECURITY DEFINER + pinned search_path — parallel to has_permission
-- and get_user_permissions. Same self-introspection guard: only
-- service_role may probe other users. Without SECURITY DEFINER the
-- SELECT would fail on `core.role_permissions` and `core.permissions`
-- (no RLS grants to authenticated for reading the catalog directly).
--
-- Forward-compatibility note: E1.1 alters `core.role_assignments.scope_id`
-- to NULLABLE so global grants (recruiter) can be represented with
-- `scope_id IS NULL`. This function returns `scope_id` as-is; the
-- LEFT JOIN to `core.scopes` and the fallback strings below already
-- handle NULL correctly. When E1.1 lands, no change here is needed.

CREATE OR REPLACE FUNCTION core.get_user_grants(p_user_id UUID)
RETURNS TABLE (
  scope_id      UUID,
  scope_type    TEXT,
  scope_name    TEXT,
  role_key      TEXT,
  permission_keys TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
STABLE
AS $$
BEGIN
  -- Self-introspection guard, same shape as has_permission.
  IF p_user_id IS DISTINCT FROM auth.uid()
     AND COALESCE(auth.role(), '') NOT IN ('service_role', 'supabase_admin')
  THEN
    RAISE EXCEPTION 'get_user_grants: cannot list another user''s grants'
      USING ERRCODE = '42501',
            HINT = 'auth.uid() does not match p_user_id; only service_role may probe other users.';
  END IF;

  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ra.scope_id,
    -- NULL scope_id (global grants, once E1.1 opens the door) surfaces
    -- as scope_type='global' so the SPA cache can differentiate at a
    -- glance without a second query.
    COALESCE(s.scope_type::text, 'global')                       AS scope_type,
    COALESCE(s.name,             '(all scopes)')                 AS scope_name,
    r.key                                                        AS role_key,
    COALESCE(
      ARRAY_AGG(DISTINCT p.key ORDER BY p.key) FILTER (WHERE p.key IS NOT NULL),
      ARRAY[]::TEXT[]
    )                                                            AS permission_keys
  FROM core.role_assignments ra
  INNER JOIN core.roles r             ON r.id = ra.role_id
  LEFT  JOIN core.scopes s            ON s.id = ra.scope_id
  LEFT  JOIN core.role_permissions rp ON rp.role_id = ra.role_id
  LEFT  JOIN core.permissions p       ON p.id       = rp.permission_id
  WHERE ra.user_id = p_user_id
    AND ra.revoked_at IS NULL
    AND ra.starts_at <= NOW()
    AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
  GROUP BY ra.scope_id, s.scope_type, s.name, r.key;
END;
$$;

COMMENT ON FUNCTION core.get_user_grants(UUID) IS
  'Returns one row per (scope, role) direct grant the user holds, with the array of permission keys attached to that role. Used by the SPA session bridge (ADR-0035) to hydrate a client-side permission cache. NOT ancestor-walked — that logic lives in core.has_permission for per-check queries.';

REVOKE ALL ON FUNCTION core.get_user_grants(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.get_user_grants(UUID) TO authenticated, service_role;
