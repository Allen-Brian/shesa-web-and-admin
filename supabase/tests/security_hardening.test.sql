-- pgTAP: hardening — storage write policies, public-form throttling, and
-- the CMS read/grant surface.
--
-- Tests:
--   A. SEC-06 — the open cms-audio write/delete policies are gone, and the
--      public read policy survived.
--   B. Every other public bucket still keeps writes to service_role only,
--      i.e. cms-audio was the outlier and now matches.
--   C. SEC-09 — consume_submission_slot allows up to the limit, then
--      refuses; a fresh key gets its own budget.
--   D. The throttle fails closed on a missing key.
--   E. SEC-10 — anon cannot read unpublished articles.
--   F. SEC-12 — the cms schema grants nothing to anon/authenticated by
--      default, so a new table is not born public.
--   G. SEC-13 — every table in the six app schemas has RLS enabled.

BEGIN;
SET LOCAL search_path = pgtap, public, cms, storage;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;
GRANT USAGE ON SCHEMA pgtap TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO anon;

SELECT plan(14);

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

-------------------------------------------------------------------------------
-- E) SEC-10 — anon cannot read an unpublished article
-------------------------------------------------------------------------------
-- The public News page filters `status = 'published'` in its own query, so
-- the site always looked right. The policy did not, and PostgREST answers
-- a request that omits the filter. Asserted behaviourally rather than by
-- matching the policy's text, so a future rewrite that preserves the
-- meaning still passes.

INSERT INTO cms.articles (slug, title, author_name, status) VALUES
  ('sec10-draft', 'SEC-10 draft',     'Test', 'draft'),
  ('sec10-sched', 'SEC-10 scheduled', 'Test', 'scheduled'),
  ('sec10-live',  'SEC-10 published', 'Test', 'published');

SET LOCAL ROLE anon;

SELECT is(
  (SELECT COUNT(*)::int FROM cms.articles WHERE slug LIKE 'sec10-%'),
  1,
  'SEC-10: anon sees one of the three seeded articles'
);

SELECT is(
  (SELECT slug FROM cms.articles WHERE slug LIKE 'sec10-%'),
  'sec10-live',
  'SEC-10: the one anon sees is the published one'
);

RESET ROLE;

-------------------------------------------------------------------------------
-- F) SEC-12 — the cms schema does not hand new tables to anon
-------------------------------------------------------------------------------
-- `ALTER DEFAULT PRIVILEGES IN SCHEMA cms GRANT SELECT ON TABLES TO anon`
-- meant every table created after it was world-readable on creation,
-- before anyone wrote a policy — and wide open if its author forgot to
-- enable RLS. The 24 existing tables carry explicit grants, so revoking
-- the defaults costs nothing and makes the next table deliberate.

SELECT is(
  (SELECT COUNT(*)::int
     FROM pg_default_acl d
     JOIN pg_namespace n ON n.oid = d.defaclnamespace
     WHERE n.nspname = 'cms'
       AND d.defaclobjtype = 'r'
       AND (array_to_string(d.defaclacl, ',') LIKE '%anon=%'
         OR array_to_string(d.defaclacl, ',') LIKE '%authenticated=%')),
  0,
  'SEC-12: no cms default privilege grants anon or authenticated anything'
);

-------------------------------------------------------------------------------
-- G) SEC-13 — every application table has RLS enabled
-------------------------------------------------------------------------------
-- RLS is the floor the whole two-layer authorization model stands on
-- (ADR-0006). A table without it is not protected by a weak policy; it is
-- protected by nothing at all, and the grants above are then the only
-- boundary. This is a regression guard: it passes today for all 73 tables.

SELECT is(
  (SELECT COALESCE(string_agg(format('%s.%s', schemaname, tablename), ', ' ORDER BY schemaname, tablename), '')
     FROM pg_tables
     WHERE schemaname IN ('core', 'audit', 'notifications', 'exco', 'finance', 'cms')
       AND NOT rowsecurity),
  '',
  'SEC-13: every table in the six app schemas has RLS enabled'
);

SELECT * FROM finish();
ROLLBACK;
