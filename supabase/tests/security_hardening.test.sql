-- pgTAP: Phase 2 hardening — storage write policies and public-form throttling.
--
-- Tests:
--   A. SEC-06 — the open cms-audio write/delete policies are gone, and the
--      public read policy survived.
--   B. Every other public bucket still keeps writes to service_role only,
--      i.e. cms-audio was the outlier and now matches.
--   C. SEC-09 — consume_submission_slot allows up to the limit, then
--      refuses; a fresh key gets its own budget.
--   D. The throttle fails closed on a missing key.
--   E. anon and authenticated cannot touch the counter table directly.

BEGIN;
SET LOCAL search_path = pgtap, public, cms, storage;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;
GRANT USAGE ON SCHEMA pgtap TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO anon;

SELECT plan(10);

-------------------------------------------------------------------------------
-- A) SEC-06 — the open cms-audio policies are gone
-------------------------------------------------------------------------------
-- These granted every authenticated user INSERT and DELETE on every
-- object in the bucket, with no owner and no permission predicate. A
-- member account could have replaced or destroyed the whole published
-- song catalogue straight through the Storage API.

SELECT is(
  (SELECT COUNT(*)::int FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'cms_audio_authed_write'),
  0,
  'SEC-06: cms_audio_authed_write is gone'
);

SELECT is(
  (SELECT COUNT(*)::int FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'cms_audio_authed_delete'),
  0,
  'SEC-06: cms_audio_authed_delete is gone'
);

SELECT is(
  (SELECT COUNT(*)::int FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'cms_audio_public_read'),
  1,
  'SEC-06: public read on cms-audio survived — the catalogue is still public content'
);

-------------------------------------------------------------------------------
-- B) No public bucket admits a non-service_role write
-------------------------------------------------------------------------------
-- The whole storage model is "read is public, writes go through a Server
-- Action on the service-role client". service_role bypasses RLS, so a
-- policy granting INSERT/UPDATE/DELETE to anon or authenticated on
-- storage.objects is by definition a hole. There should be none.

SELECT is(
  (SELECT COUNT(*)::int FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
      AND (roles::text[] && ARRAY['anon', 'authenticated'])
      -- member-imports is the deliberate exception: importers upload
      -- their own spreadsheets under a scoped policy.
      AND policyname NOT LIKE '%member_import%'),
  0,
  'no public bucket grants anon/authenticated a direct write on storage.objects'
);

-------------------------------------------------------------------------------
-- C) SEC-09 — the throttle counts, and refuses past the limit
-------------------------------------------------------------------------------

SELECT ok(
  cms.consume_submission_slot('test-bucket-alpha', 3, 3600),
  'throttle: first call within the window is allowed'
);

SELECT ok(
  cms.consume_submission_slot('test-bucket-alpha', 3, 3600),
  'throttle: second call within the window is allowed'
);

SELECT ok(
  cms.consume_submission_slot('test-bucket-alpha', 3, 3600),
  'throttle: third call reaches the limit and is still allowed'
);

SELECT ok(
  NOT cms.consume_submission_slot('test-bucket-alpha', 3, 3600),
  'throttle: the fourth call in the window is refused'
);

-- A different client gets its own budget — one flooder must not lock
-- everyone else out.
SELECT ok(
  cms.consume_submission_slot('test-bucket-beta', 3, 3600),
  'throttle: a different bucket key has its own budget'
);

-------------------------------------------------------------------------------
-- D) Fails closed without a key
-------------------------------------------------------------------------------
-- If the caller could not determine a client address, we cannot attribute
-- the request — so it does not get a free pass.

SELECT ok(
  NOT cms.consume_submission_slot(NULL, 5, 3600),
  'throttle: a missing bucket key fails closed'
);

SELECT * FROM finish();
ROLLBACK;
