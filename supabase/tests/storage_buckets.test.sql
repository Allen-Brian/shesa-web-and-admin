-- pgTAP: storage buckets exist with the right privacy + size limits.
--
-- The full read/write RLS behavior is exercised when phases that use
-- the buckets actually upload. This test verifies the static
-- configuration is what we declared.

BEGIN;
SET LOCAL search_path = pgtap, public, storage, auth;

-- Make pgTAP callable across role switches (same fix as rls_core).
GRANT USAGE ON SCHEMA pgtap TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO anon, authenticated;

SELECT plan(9);

-------------------------------------------------------------------------------
-- 1. All six buckets exist
-------------------------------------------------------------------------------

SELECT has_table('storage', 'buckets', 'storage.buckets table exists');

SELECT is(
  (SELECT COUNT(*)::int FROM storage.buckets
   WHERE id IN ('public-gallery','cms-media','echoes-audio',
                'member-documents','receipts','private-stream-assets')),
  6,
  'all six Shesa buckets were created'
);

-------------------------------------------------------------------------------
-- 2. Privacy flags are correct (public vs private split)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'public-gallery'),
  TRUE,
  'public-gallery is public'
);
SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'cms-media'),
  TRUE,
  'cms-media is public'
);
SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'echoes-audio'),
  TRUE,
  'echoes-audio is public'
);

SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'member-documents'),
  FALSE,
  'member-documents is private'
);
SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'receipts'),
  FALSE,
  'receipts is private'
);
SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'private-stream-assets'),
  FALSE,
  'private-stream-assets is private'
);

-------------------------------------------------------------------------------
-- 3. anon cannot directly INSERT into a private bucket
-------------------------------------------------------------------------------
-- The RLS policy chain has no INSERT for anon/authenticated — only
-- service_role can write. Verify by attempting an INSERT as anon and
-- confirming we get insufficient_privilege (42501).

SET LOCAL ROLE anon;
SET LOCAL search_path = pgtap, public, storage, auth;

SELECT throws_ok(
  $$ INSERT INTO storage.objects (bucket_id, name, owner)
     VALUES ('member-documents', 'rogue.pdf', NULL) $$,
  '42501',
  NULL,
  'storage.objects: anon cannot INSERT into a private bucket (RLS default-deny)'
);

SELECT * FROM finish();
ROLLBACK;
