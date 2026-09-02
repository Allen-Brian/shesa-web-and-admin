-- Migration: create_event_advert_images_bucket
--
-- Adds a public Supabase Storage bucket for event advert images
-- (banners + gallery). The first uploaded URL renders as the event
-- detail page's hero cover; the rest are gallery images.
--
-- Bucket privacy model matches the existing public buckets from
-- 20260630191226_init_storage_buckets.sql:
--   * public read (anon + authenticated), file-CDN URL works without
--     signed access — events are public-facing content.
--   * All writes via service_role only. Uploads go through Server
--     Actions in apps/admin (uploadEventAdvertImage) that authorize
--     the caller first (must be able to event.create somewhere).
--
-- Object-path convention (enforced at the app layer, not by DB):
--   event-advert-images/{auth_user_id}/{timestamp}-{filename}
-- Uploader-scoped so multiple admins uploading in parallel don't
-- collide, and unattached uploads are easy to reap by owner later.
--
-- Limits:
--   file_size_limit = 5 MB (larger enters CDN cost / mobile-data pain
--     for Cameroonian users on 3G — resize before uploading).
--   allowed_mime_types matches the other public image buckets.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-advert-images',
  'event-advert-images',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- Public SELECT for the new bucket — mirrors the shape of the shared
-- public-buckets policy from 20260630191226, but keyed to just this
-- bucket so the older policy stays untouched (and the two are easy
-- to reason about independently).
CREATE POLICY storage_objects_event_advert_images_select
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'event-advert-images');

-- No INSERT / UPDATE / DELETE policies for anon or authenticated —
-- writes flow via service_role from the uploadEventAdvertImage
-- Server Action. That action authorizes the caller (event.create at
-- some scope) before touching Storage.
--
-- COMMENT ON POLICY intentionally omitted — the postgres role can't
-- comment on storage.objects (owned by supabase_storage_admin). The
-- rationale lives in this migration header instead.
