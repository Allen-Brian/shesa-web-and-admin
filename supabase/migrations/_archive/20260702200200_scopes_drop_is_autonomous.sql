-- Migration: scopes_drop_is_autonomous
--
-- Finishes the migration started by 20260701200100_extend_core_scopes.sql,
-- which introduced `chapter_kind` as the semantic replacement for the
-- `is_autonomous` boolean but kept the boolean around because the RBAC
-- ancestry walk (`WHERE NOT a.is_autonomous`) referenced it.
--
-- Here we:
--   1. Rewrite core.has_permission + core.get_user_permissions so the
--      recursive CTE stops climbing at autonomous chapters via
--      `chapter_kind IS DISTINCT FROM 'autonomous'` (semantically identical
--      to the old `NOT is_autonomous` since chapter_kind is only NON-NULL
--      on chapter rows, and only autonomous chapters set it to 'autonomous').
--   2. Drop the now-unused `scopes.is_autonomous` column.
--
-- Rationale for grouping the rewrite + drop in one migration:
--   Splitting would leave the column in place with no reader, which is
--   just an interim shape that adds no safety. Doing both here keeps the
--   schema surface honest.
--
-- has_permission body notes:
--   The last version (20260701200000_alter_role_assignments_nullable_scope)
--   added NULL-scope handling for global grants. Preserve that unchanged
--   while swapping the autonomy predicate.

-------------------------------------------------------------------------------
-- 1. Rewrite core.has_permission
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
    -- The target scope itself is always in the ancestry, regardless of
    -- its own kind. Autonomy gates inheritance FROM the parent, not the
    -- scope's own grants.
    SELECT s.id, s.parent_scope_id, s.chapter_kind
    FROM core.scopes s
    WHERE s.id = p_scope_id

    UNION ALL

    -- Climb to the parent only when the CURRENT ancestor is NOT an
    -- autonomous chapter. chapter_kind is NULL for non-chapters and
    -- non-null for chapters; `IS DISTINCT FROM 'autonomous'` returns
    -- TRUE for both non-chapters and grouping chapters, matching the
    -- pre-migration `NOT is_autonomous` semantic exactly.
    SELECT s.id, s.parent_scope_id, s.chapter_kind
    FROM core.scopes s
    INNER JOIN scope_ancestry a ON s.id = a.parent_scope_id
    WHERE a.chapter_kind IS DISTINCT FROM 'autonomous'
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
      AND (ra.scope_id IS NULL OR sa.id IS NOT NULL)
  ) INTO v_result;

  RETURN COALESCE(v_result, FALSE);
END;
$$;

COMMENT ON FUNCTION core.has_permission(UUID, UUID, TEXT) IS
  'Returns TRUE if the user has the named permission at the scope (or any non-autonomous-chapter ancestor, or via a global grant with scope_id=NULL). SECURITY DEFINER bypasses RLS on the RBAC tables. Self-introspection guarded.';

-------------------------------------------------------------------------------
-- 2. Rewrite core.get_user_permissions
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
    SELECT s.id, s.parent_scope_id, s.chapter_kind
    FROM core.scopes s
    WHERE s.id = p_scope_id

    UNION ALL

    SELECT s.id, s.parent_scope_id, s.chapter_kind
    FROM core.scopes s
    INNER JOIN scope_ancestry a ON s.id = a.parent_scope_id
    WHERE a.chapter_kind IS DISTINCT FROM 'autonomous'
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
  'Returns the distinct set of permission keys a user has at the scope (via roles granted there, in non-autonomous-chapter ancestors, or via global grants with scope_id=NULL).';

-------------------------------------------------------------------------------
-- 3. Drop the now-unused column
-------------------------------------------------------------------------------
-- Nothing else queries `is_autonomous` after the rewrite above. The
-- CHECK/index that reference chapter_kind stay untouched.

ALTER TABLE core.scopes DROP COLUMN is_autonomous;
