-- Migration: alter_role_assignments_nullable_scope
--
-- Widens `core.role_assignments.scope_id` to NULLABLE so global grants
-- (Phase 1 §2.17 Recruiter) can be represented as `scope_id IS NULL`
-- meaning "applies at every scope."
--
-- LANDS EARLY IN E1.1 — not in E1.5 as the initial spec had it — so every
-- downstream Phase 1 epic writes `scope_id` predicates against the final
-- column shape from day one. Predicates written as `scope_id = X` alone
-- silently drop global grants under three-valued logic; every RLS
-- policy, permission check, and grant-count trigger in E1.1–E1.4 must
-- use `(scope_id IS NULL OR scope_id = X)` form. The permission checker
-- gets updated here so downstream RLS policies calling `has_permission`
-- pick up the corrected semantic immediately.
--
-- What changes:
--   1. `scope_id` becomes nullable.
--   2. The unique-active index becomes `NULLS NOT DISTINCT` so a user
--      can't be double-granted the same global role.
--   3. `has_permission` widened: a NULL-scope active grant matches any
--      `p_scope_id`.
--   4. `get_user_permissions` widened: same treatment.
--   5. `get_user_grants` unchanged (already returns NULL scope_id
--      correctly via LEFT JOIN, added in the previous migration).

-------------------------------------------------------------------------------
-- 1. Widen scope_id
-------------------------------------------------------------------------------

ALTER TABLE core.role_assignments
  ALTER COLUMN scope_id DROP NOT NULL;

COMMENT ON COLUMN core.role_assignments.scope_id IS
  'The scope this grant applies at. NULL means the grant is global (applies at every scope) — used for the Recruiter role per Phase 1 §2.17. Every predicate that filters by scope_id must use (scope_id IS NULL OR scope_id = X) form; scope_id = X alone silently drops global grants.';

-------------------------------------------------------------------------------
-- 2. Rebuild the unique-active index with NULLS NOT DISTINCT
-------------------------------------------------------------------------------
-- Postgres's default `NULL IS DISTINCT FROM NULL` means the old unique
-- index would happily accept two rows (user_id, NULL, role_id) — a
-- user double-granted the same global role. `NULLS NOT DISTINCT` (PG 15+)
-- treats them as equal for uniqueness purposes, which is the semantic
-- we want for grants.

DROP INDEX core.role_assignments_unique_active;

CREATE UNIQUE INDEX role_assignments_unique_active
  ON core.role_assignments (user_id, scope_id, role_id)
  NULLS NOT DISTINCT
  WHERE revoked_at IS NULL;

-------------------------------------------------------------------------------
-- 3. Update has_permission to treat NULL scope as any-scope match
-------------------------------------------------------------------------------
-- The recursive CTE for scope ancestry stays the same — it walks up from
-- p_scope_id until it hits an autonomous boundary. What changes is the
-- final EXISTS clause: a grant matches EITHER because its scope_id is
-- in the ancestry (scoped grant) OR because its scope_id is NULL
-- (global grant).

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
  IF p_user_id IS DISTINCT FROM auth.uid()
     AND COALESCE(auth.role(), '') NOT IN ('service_role', 'supabase_admin')
  THEN
    RAISE EXCEPTION 'has_permission: cannot check another user''s permissions'
      USING ERRCODE = '42501',
            HINT = 'auth.uid() does not match p_user_id; only service_role may probe other users.';
  END IF;

  IF p_user_id IS NULL OR p_scope_id IS NULL OR p_permission_key IS NULL THEN
    RETURN FALSE;
  END IF;

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
  SELECT EXISTS (
    SELECT 1
    FROM core.role_assignments ra
    INNER JOIN core.role_permissions rp ON rp.role_id = ra.role_id
    INNER JOIN core.permissions p        ON p.id      = rp.permission_id
    LEFT  JOIN scope_ancestry sa         ON sa.id     = ra.scope_id
    WHERE ra.user_id = p_user_id
      AND p.key     = p_permission_key
      AND ra.revoked_at IS NULL
      AND ra.starts_at <= NOW()
      AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
      -- Match either a scoped grant whose scope is in the ancestry,
      -- or a global grant (scope_id IS NULL).
      AND (ra.scope_id IS NULL OR sa.id IS NOT NULL)
  ) INTO v_result;

  RETURN COALESCE(v_result, FALSE);
END;
$$;

COMMENT ON FUNCTION core.has_permission(UUID, UUID, TEXT) IS
  'Returns TRUE if the user has the named permission at the scope (or any non-autonomous ancestor, or via a global grant with scope_id=NULL). SECURITY DEFINER bypasses RLS on the RBAC tables. Self-introspection guarded: authenticated callers can only check their own user_id.';

-------------------------------------------------------------------------------
-- 4. Update get_user_permissions with the same NULL-scope semantic
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
  IF p_user_id IS DISTINCT FROM auth.uid()
     AND COALESCE(auth.role(), '') NOT IN ('service_role', 'supabase_admin')
  THEN
    RAISE EXCEPTION 'get_user_permissions: cannot list another user''s permissions'
      USING ERRCODE = '42501',
            HINT = 'auth.uid() does not match p_user_id; only service_role may probe other users.';
  END IF;

  IF p_user_id IS NULL OR p_scope_id IS NULL THEN
    RETURN;
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
  LEFT  JOIN scope_ancestry sa         ON sa.id     = ra.scope_id
  WHERE ra.user_id = p_user_id
    AND ra.revoked_at IS NULL
    AND ra.starts_at <= NOW()
    AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
    AND (ra.scope_id IS NULL OR sa.id IS NOT NULL);
END;
$$;

COMMENT ON FUNCTION core.get_user_permissions(UUID, UUID) IS
  'Returns the distinct set of permission keys a user has at the scope (via roles granted there, in non-autonomous ancestors, OR via global grants with scope_id=NULL). Use for resolving "effective permissions" once; use has_permission for single-permission checks.';
