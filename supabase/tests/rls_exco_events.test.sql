-- pgTAP: RLS on exco.events — same siloed-admin-visibility pattern
-- as announcements (ADR-0041). Sibling deny + parent-child deny (both
-- directions) + non-admin role + revoked admin + anon.
--
-- Also asserts the "global mainstream_admin → Mainstream" mapping
-- that migration 20260704180000 inherits from the announcements
-- refinement (20260704160000). Skipping that assertion would let a
-- future well-meaning "match the announcements policy" edit forget
-- to include the UNION clause.
--
-- Test UUIDs mirror rls_exco_announcements.test.sql shape. Anchor:
-- 88 to differentiate.
--   aa = Mainstream admin, gg = Global mainstream_admin
--   a1 = Branch A admin, b1 = Branch B admin, c1 = Chapter admin
--   fa = finance user, da = revoked admin
--   ba = Branch A scope, bb = Branch B scope, ca = Chapter scope

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, exco, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated, anon;

SELECT plan(11);

-------------------------------------------------------------------------------
-- Setup
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('88888899-0000-0000-0000-0000000000aa', 'ma-ev@shesa.test',  '00000000-0000-0000-0000-000000000000'),
  ('88888899-0000-0000-0000-0000000000ea', 'gm-ev@shesa.test',  '00000000-0000-0000-0000-000000000000'),
  ('88888899-0000-0000-0000-0000000000a1', 'a1-ev@shesa.test',  '00000000-0000-0000-0000-000000000000'),
  ('88888899-0000-0000-0000-0000000000b1', 'b1-ev@shesa.test',  '00000000-0000-0000-0000-000000000000'),
  ('88888899-0000-0000-0000-0000000000c1', 'c1-ev@shesa.test',  '00000000-0000-0000-0000-000000000000'),
  ('88888899-0000-0000-0000-0000000000fa', 'fa-ev@shesa.test',  '00000000-0000-0000-0000-000000000000'),
  ('88888899-0000-0000-0000-0000000000da', 'da-ev@shesa.test',  '00000000-0000-0000-0000-000000000000');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, chapter_kind) VALUES
  ('88888899-1111-0000-0000-0000000000ba', 'EV Test Branch A', 't-ev-branch-a', 'branch',
     '00000000-0000-0000-0000-000000000001', NULL),
  ('88888899-1111-0000-0000-0000000000bb', 'EV Test Branch B', 't-ev-branch-b', 'branch',
     '00000000-0000-0000-0000-000000000001', NULL),
  ('88888899-1111-0000-0000-0000000000ca', 'EV Test Chapter under A', 't-ev-chap-a', 'chapter',
     '88888899-1111-0000-0000-0000000000ba', 'autonomous');

INSERT INTO core.role_assignments (id, user_id, scope_id, role_id, granted_by) VALUES
  -- Scoped mainstream_admin @ Mainstream (specific)
  ('88888899-2222-0000-0000-0000000000aa',
   '88888899-0000-0000-0000-0000000000aa',
   '00000000-0000-0000-0000-000000000001',
   (SELECT id FROM core.roles WHERE key = 'mainstream_admin'),
   NULL),
  -- Global mainstream_admin (scope_id = NULL) — should map to Mainstream
  ('88888899-2222-0000-0000-0000000000ea',
   '88888899-0000-0000-0000-0000000000ea',
   NULL,
   (SELECT id FROM core.roles WHERE key = 'mainstream_admin'),
   NULL),
  -- branch_admin @ Branch A
  ('88888899-2222-0000-0000-0000000000a1',
   '88888899-0000-0000-0000-0000000000a1',
   '88888899-1111-0000-0000-0000000000ba',
   (SELECT id FROM core.roles WHERE key = 'branch_admin'),
   NULL),
  -- branch_admin @ Branch B
  ('88888899-2222-0000-0000-0000000000b1',
   '88888899-0000-0000-0000-0000000000b1',
   '88888899-1111-0000-0000-0000000000bb',
   (SELECT id FROM core.roles WHERE key = 'branch_admin'),
   NULL),
  -- branch_admin @ Chapter under A
  ('88888899-2222-0000-0000-0000000000c1',
   '88888899-0000-0000-0000-0000000000c1',
   '88888899-1111-0000-0000-0000000000ca',
   (SELECT id FROM core.roles WHERE key = 'branch_admin'),
   NULL),
  -- finance @ Branch A (non-admin)
  ('88888899-2222-0000-0000-0000000000fa',
   '88888899-0000-0000-0000-0000000000fa',
   '88888899-1111-0000-0000-0000000000ba',
   (SELECT id FROM core.roles WHERE key = 'finance'),
   NULL);

-- Revoked branch_admin @ Branch A
INSERT INTO core.role_assignments
  (id, user_id, scope_id, role_id, granted_by, revoked_at, revoked_by) VALUES
  ('88888899-2222-0000-0000-0000000000da',
   '88888899-0000-0000-0000-0000000000da',
   '88888899-1111-0000-0000-0000000000ba',
   (SELECT id FROM core.roles WHERE key = 'branch_admin'),
   NULL,
   NOW() - INTERVAL '1 hour',
   '88888899-0000-0000-0000-0000000000aa');

-- Events (one per scope). start_at + end_at + venue satisfy the
-- events_has_location CHECK and events_schedule_ordered CHECK.
INSERT INTO exco.events (id, owner_scope_id, name, start_at, end_at, venue_name) VALUES
  ('88888899-3333-0000-0000-0000000000aa',
     '00000000-0000-0000-0000-000000000001',
     'Mainstream event',
     NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days 2 hours', 'Mainstream HQ'),
  ('88888899-3333-0000-0000-0000000000ba',
     '88888899-1111-0000-0000-0000000000ba',
     'Branch A event',
     NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days 2 hours', 'Branch A hall'),
  ('88888899-3333-0000-0000-0000000000bb',
     '88888899-1111-0000-0000-0000000000bb',
     'Branch B event',
     NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days 2 hours', 'Branch B hall'),
  ('88888899-3333-0000-0000-0000000000ca',
     '88888899-1111-0000-0000-0000000000ca',
     'Chapter-under-A event',
     NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 2 hours', 'Chapter hall');

-------------------------------------------------------------------------------
-- Test 1: sanity — superuser sees 4 test events (RLS bypassed)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.events WHERE id::text LIKE '88888899-3333%'),
  4,
  'setup: 4 test events created (as superuser, RLS bypassed)'
);

-------------------------------------------------------------------------------
-- Test 2: scoped mainstream_admin sees Mainstream event
-------------------------------------------------------------------------------

SET LOCAL request.jwt.claim.sub  = '88888899-0000-0000-0000-0000000000aa';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, exco, auth;

SELECT is(
  (SELECT COUNT(*)::int FROM exco.events
   WHERE id = '88888899-3333-0000-0000-0000000000aa'),
  1,
  'scoped mainstream_admin @ Mainstream CAN see Mainstream-owned event'
);

-------------------------------------------------------------------------------
-- Test 3: scoped mainstream_admin does NOT see Branch A event
-- (parent → child cascade blocked per ADR-0041)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.events
   WHERE id = '88888899-3333-0000-0000-0000000000ba'),
  0,
  'mainstream_admin does NOT see Branch A event (parent-child down deny)'
);

-------------------------------------------------------------------------------
-- Test 4: GLOBAL mainstream_admin (scope_id IS NULL) maps to Mainstream
-- (per the ADR-0041 refinement — announcements/events share this)
-------------------------------------------------------------------------------

RESET ROLE;
SET LOCAL request.jwt.claim.sub  = '88888899-0000-0000-0000-0000000000ea';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, exco, auth;

SELECT is(
  (SELECT COUNT(*)::int FROM exco.events
   WHERE id = '88888899-3333-0000-0000-0000000000aa'),
  1,
  'GLOBAL mainstream_admin (scope_id NULL) sees Mainstream event via Mainstream-mapping'
);

-------------------------------------------------------------------------------
-- Test 5: Global mainstream_admin does NOT see Branch A event
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.events
   WHERE id = '88888899-3333-0000-0000-0000000000ba'),
  0,
  'GLOBAL mainstream_admin still siloed — no Branch A event'
);

-------------------------------------------------------------------------------
-- Test 6: branch_admin @ Branch A sees Branch A event
-------------------------------------------------------------------------------

RESET ROLE;
SET LOCAL request.jwt.claim.sub  = '88888899-0000-0000-0000-0000000000a1';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, exco, auth;

SELECT is(
  (SELECT COUNT(*)::int FROM exco.events
   WHERE id = '88888899-3333-0000-0000-0000000000ba'),
  1,
  'branch_admin @ Branch A CAN see Branch A event'
);

-------------------------------------------------------------------------------
-- Test 7: branch_admin @ Branch A does NOT see Branch B (sibling deny)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.events
   WHERE id = '88888899-3333-0000-0000-0000000000bb'),
  0,
  'branch_admin @ Branch A does NOT see sibling Branch B event'
);

-------------------------------------------------------------------------------
-- Test 8: branch_admin @ Branch A does NOT see Chapter-under-A
-- (parent → child cascade blocked — the assertion most likely to
-- trip a "helpful" scope-tree fix)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.events
   WHERE id = '88888899-3333-0000-0000-0000000000ca'),
  0,
  'branch_admin @ Branch A does NOT see Chapter-under-A event (parent-child down deny)'
);

-------------------------------------------------------------------------------
-- Test 9: finance role sees nothing at Branch A
-------------------------------------------------------------------------------

RESET ROLE;
SET LOCAL request.jwt.claim.sub  = '88888899-0000-0000-0000-0000000000fa';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, exco, auth;

SELECT is(
  (SELECT COUNT(*)::int FROM exco.events
   WHERE id = '88888899-3333-0000-0000-0000000000ba'),
  0,
  'finance role does NOT see Branch A event (non-admin role denied)'
);

-------------------------------------------------------------------------------
-- Test 10: revoked branch_admin sees nothing
-------------------------------------------------------------------------------

RESET ROLE;
SET LOCAL request.jwt.claim.sub  = '88888899-0000-0000-0000-0000000000da';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, exco, auth;

SELECT is(
  (SELECT COUNT(*)::int FROM exco.events
   WHERE id = '88888899-3333-0000-0000-0000000000ba'),
  0,
  'revoked branch_admin @ Branch A does NOT see Branch A event'
);

-------------------------------------------------------------------------------
-- Test 11: anon is denied at the grant layer
-------------------------------------------------------------------------------

RESET ROLE;
SET LOCAL request.jwt.claim.sub  = '';
SET LOCAL request.jwt.claim.role = 'anon';
SET LOCAL ROLE anon;
SET LOCAL search_path = pgtap, public, audit, core, exco, auth;

SELECT throws_ok(
  $$ SELECT COUNT(*) FROM exco.events $$,
  '42501',
  NULL,
  'anon role cannot SELECT from exco.events (no table grant to anon)'
);

-------------------------------------------------------------------------------
RESET ROLE;
SELECT * FROM finish();

ROLLBACK;
