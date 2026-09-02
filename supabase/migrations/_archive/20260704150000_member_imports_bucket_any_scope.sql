-- Migration: member_imports_bucket_any_scope
--
-- The `member-imports` storage bucket INSERT policy required
-- `member.import` at `mainstream_scope_id()`. That works for
-- mainstream_admin but blocks every scoped admin who legitimately
-- imports rosters into their own scope — a batch_admin for their
-- batch's alumni, a branch_admin for a branch's onboarding sheet.
--
-- The Edge Function `imports/upload-member-import` already re-checks
-- `member.import` at the caller-provided `scopeId` (with a proper
-- forbidden envelope), so the storage layer only needs a coarser
-- "does this user have member.import somewhere?" gate. Anything more
-- specific would need parsing scope info out of the storage path,
-- which the current file-naming scheme doesn't support.
--
-- New helper: `core.has_permission_at_any_scope(user_id, key)` —
-- TRUE iff the user has an active, non-revoked grant carrying the
-- permission at ANY scope (including NULL / global). SECURITY DEFINER
-- so it bypasses RLS on the RBAC tables it consults.

CREATE OR REPLACE FUNCTION core.has_permission_at_any_scope(
  p_user_id UUID,
  p_key     TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
BEGIN
  IF p_user_id IS NULL OR p_key IS NULL THEN RETURN FALSE; END IF;

  RETURN EXISTS (
    SELECT 1
    FROM core.role_assignments ra
    INNER JOIN core.role_permissions rp ON rp.role_id = ra.role_id
    INNER JOIN core.permissions p        ON p.id     = rp.permission_id
    WHERE ra.user_id = p_user_id
      AND p.key      = p_key
      AND ra.revoked_at IS NULL
      AND ra.starts_at <= NOW()
      AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
  );
END;
$$;

COMMENT ON FUNCTION core.has_permission_at_any_scope(UUID, TEXT) IS
  'Cheap "does the user hold this permission at any scope?" gate for coarse checks (e.g. storage-bucket INSERT policies). NOT a substitute for per-scope has_permission — use at boundaries where the real scope check happens downstream.';

REVOKE ALL ON FUNCTION core.has_permission_at_any_scope(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.has_permission_at_any_scope(UUID, TEXT) TO authenticated, service_role;

-- Replace the bucket INSERT policy with one that uses the any-scope
-- check. Downstream authorization stays with the Edge Function.
DROP POLICY IF EXISTS storage_objects_member_imports_insert ON storage.objects;

CREATE POLICY storage_objects_member_imports_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'member-imports'
    AND core.has_permission_at_any_scope(auth.uid(), 'member.import')
  );
