-- Migration: init_storage_buckets
--
-- Per spec §14, creates the six Supabase Storage buckets Shesa uses
-- across its phases, plus the storage.objects RLS policies that gate
-- access by bucket-privacy class.
--
-- These buckets are EMPTY in Phase 0. Content lands as each owning
-- phase ships:
--
--   public-gallery        Phase 5  — CMS public photo gallery
--   cms-media             Phase 5  — articles, branch-page hero images
--   echoes-audio          Phase 5  — Echoes music files
--   member-documents      Phase 1+ — member-uploaded docs (KYC, etc.)
--   receipts              Phase 3  — payment-receipt PDFs
--   private-stream-assets Phase 5  — Stream protected video/audio
--
-- Decision (per the schemas-per-phase rule the user established):
--   Buckets ARE pre-created in Phase 0 because (a) bucket creation is
--   trivial — no schema design risk to defer — and (b) the policy
--   patterns get exercised early. Per-bucket policies that need
--   tightening when their phase ships (e.g. "members can upload their
--   own profile photo to member-documents") get added in that phase's
--   migration.
--
-- The privacy model:
--
--   Public buckets (public-gallery, cms-media, echoes-audio):
--     * Anyone (anon + authenticated) can SELECT object metadata.
--     * Anyone can fetch the file via the direct CDN URL.
--     * Only service_role can INSERT/UPDATE/DELETE — uploads land via
--       Server Actions / Edge Functions that have already authorized
--       the write at the app layer.
--
--   Private buckets (member-documents, receipts, private-stream-assets):
--     * NO SELECT for authenticated or anon. Access goes through
--       signed URLs (Supabase Storage's server-side mechanism that
--       bypasses RLS via a time-limited JWT in the URL).
--     * Only service_role can INSERT/UPDATE/DELETE. When a phase
--       needs end-user uploads (e.g. members uploading their own
--       photo), it adds a more permissive INSERT policy scoped to
--       owner = auth.uid().
--
-- Schema note: the `storage` schema is owned by `supabase_storage_admin`
-- — postgres (the migration role) can INSERT into storage.buckets and
-- CREATE POLICY on storage.objects (Supabase grants those explicitly),
-- but it CANNOT create functions inside the `storage` schema. That's
-- why this file inlines the bucket-class lists into each policy rather
-- than extracting a helper into `storage.is_public_bucket(...)`. If we
-- need a helper later (e.g. when the list grows), it goes in `public`
-- (or `core`) — not `storage`.

-------------------------------------------------------------------------------
-- 1. Bucket creation — idempotent via ON CONFLICT
-------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  -- Public buckets
  ('public-gallery',   'public-gallery',   TRUE,  10485760,  ARRAY['image/jpeg','image/png','image/webp','image/avif']),  -- 10 MB images
  ('cms-media',        'cms-media',        TRUE,  10485760,  ARRAY['image/jpeg','image/png','image/webp','image/avif','image/svg+xml']),
  ('echoes-audio',     'echoes-audio',     TRUE,  52428800,  ARRAY['audio/mpeg','audio/mp4','audio/wav','audio/ogg']),  -- 50 MB audio

  -- Private buckets
  ('member-documents',     'member-documents',     FALSE, 10485760,  ARRAY['application/pdf','image/jpeg','image/png']),  -- 10 MB docs/photos
  ('receipts',             'receipts',             FALSE, 5242880,   ARRAY['application/pdf']),                            -- 5 MB PDFs only
  ('private-stream-assets','private-stream-assets',FALSE, 524288000, ARRAY['video/mp4','audio/mpeg','audio/mp4'])         -- 500 MB video/audio
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------------------------------
-- 2. RLS policies on storage.objects
-------------------------------------------------------------------------------
-- storage.objects has RLS enabled by default in Supabase. Phase 0 adds
-- the per-bucket-class baseline; later phases tighten/loosen for
-- specific buckets.
--
-- Lists are inlined (see schema note in the header). Adding a bucket
-- to a class means editing the corresponding policy in a new migration
-- — the alternative (a helper function in `storage`) isn't available
-- to us at the migration role.

-- Public buckets: anyone may SELECT object rows.
-- (The direct CDN URL serves the file regardless of this; the policy
-- exists so supabase-js .list() and similar metadata reads work for
-- unauthenticated browse pages.)
CREATE POLICY storage_objects_public_buckets_select
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id IN ('public-gallery', 'cms-media', 'echoes-audio'));

-- Private buckets: NO policy for SELECT. Default-deny applies. Signed
-- URLs (generated server-side via supabase.storage.from(bucket).createSignedUrl(...))
-- bypass RLS via the Supabase Storage service — that's the intended
-- access path for these buckets.

-- All buckets: writes only via service_role. NO policy for
-- INSERT/UPDATE/DELETE to anon or authenticated → default-deny.
-- service_role bypasses RLS entirely (Supabase grants BYPASSRLS to
-- service_role). When a phase needs end-user uploads, it adds a
-- specific policy scoped to that bucket + owner = auth.uid().
