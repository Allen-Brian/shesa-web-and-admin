-- Migration: add_member_imports_bucket
--
-- Adds the private `member-imports` bucket that Phase 1 E1.3 uses to
-- stage uploaded .xlsx files before the Edge Function parses them.
--
-- Mirrors the "private bucket" pattern established in the Phase 0
-- init_storage_buckets migration:
--   - `public = FALSE`.
--   - No public SELECT policy (default-deny for anon/authenticated).
--   - service_role bypasses RLS, so `upload-member-import` reads via
--     the service-role client after the app-layer permission gate has
--     approved the request.
--
-- Uploads DO go through end-user credentials, so an INSERT policy for
-- `member.import` holders is added below. Read-back of the raw file
-- stays on service_role — the review UI reads `import_rows`, not the
-- raw .xlsx.

-------------------------------------------------------------------------------
-- 1. Bucket
-------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('member-imports', 'member-imports', FALSE, 10485760, ARRAY[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  -- .xlsx
    'application/vnd.ms-excel'                                            -- .xls (legacy)
  ])
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------------------------------
-- 2. Upload policy — member.import holders at Mainstream
-------------------------------------------------------------------------------
-- We use Mainstream-level permission for now; branch-scoped uploads
-- (which would let a Branch Admin upload their own imports) is a
-- Phase 1 follow-up when the Exco UI's Branch context lands.

CREATE POLICY storage_objects_member_imports_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'member-imports'
    AND core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.import')
  );

-- No SELECT / UPDATE / DELETE for authenticated → default-deny. The
-- upload-member-import Edge Function reads the object via the
-- service-role client which bypasses RLS.
