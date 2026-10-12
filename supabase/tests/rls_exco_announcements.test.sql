-- pgTAP: RLS on exco.announcements — the siloed-admin-visibility suite.
--
-- ADR-0041 mandates asserting BOTH the sibling-deny AND the
-- parent-child-deny paths, because the whole point of the ADR is
-- that a "helpful" refactor could quietly add scope-tree traversal
-- and pass a sibling-only test suite. Every assertion below has a
-- deliberate deny-path pair.
--
-- Key silo assertions:
--   - Mainstream admin does NOT see Branch announcements.
--   - Branch admin does NOT see sibling Branch announcements.
--   - Branch admin does NOT see child Chapter announcements.
--   - Branch admin does NOT see parent Mainstream announcements.
--   - Non-admin roles (Finance) see nothing regardless of scope.
--   - Revoked admin sees nothing.
--
-- search_path discipline: see the header of rls_core.test.sql.
--
-- Test UUIDs — all 12-char hex last-segment, all rolled back at COMMIT.
-- Layout (mnemonic in the last two hex chars):
--   aa = Mainstream, a1 = Branch A, b1 = Branch B, c1 = Chapter,
--   fa = Finance user, da = revoked (Denied Admin)
--   ba = Branch A scope, bb = Branch B scope, ca = Chapter scope
-- Segment 2 differentiates entity type:
--   0000 = users, 1111 = scopes, 2222 = role_assignments, 3333 = announcements

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, exco, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated, anon;

SELECT plan(10);

-------------------------------------------------------------------------------
-- Setup — runs as the default superuser role (bypasses RLS for state)
-------------------------------------------------------------------------------

-- Users
INSERT INTO auth.users (id, email, instance_id) VALUES
  ('77777777-0000-0000-0000-0000000000aa', 'ma@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('77777777-0000-0000-0000-0000000000a1', 'a1@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('77777777-0000-0000-0000-0000000000b1', 'b1@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('77777777-0000-0000-0000-0000000000c1', 'c1@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('77777777-0000-0000-0000-0000000000fa', 'fa@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('77777777-0000-0000-0000-0000000000da', 'da@shesa.test', '00000000-0000-0000-0000-000000000000');

-- Scopes: Branch A, Branch B (sibling), Chapter under A (child).
-- Mainstream (00000000-...-0001) is already seeded.
INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, chapter_kind)
VALUES
  ('77777777-1111-0000-0000-0000000000ba', 'Test Branch A', 't-branch-a', 'branch',
     '00000000-0000-0000-0000-000000000001', NULL),
  ('77777777-1111-0000-0000-0000000000bb', 'Test Branch B', 't-branch-b', 'branch',
     '00000000-0000-0000-0000-000000000001', NULL),
  ('77777777-1111-0000-0000-0000000000ca', 'Test Chapter under A', 't-chap-a', 'chapter',
     '77777777-1111-0000-0000-0000000000ba', 'autonomous');

-- Role assignments (active grants)
INSERT INTO core.role_assignments (id, user_id, scope_id, role_id, granted_by)
VALUES
  -- mainstream_admin @ Mainstream
  ('77777777-2222-0000-0000-0000000000aa',
   '77777777-0000-0000-0000-0000000000aa',
   '00000000-0000-0000-0000-000000000001',
   (SELECT id FROM core.roles WHERE key = 'mainstream_admin'),
   NULL),
  -- branch_admin @ Branch A
  ('77777777-2222-0000-0000-0000000000a1',
   '77777777-0000-0000-0000-0000000000a1',
   '77777777-1111-0000-0000-0000000000ba',
   (SELECT id FROM core.roles WHERE key = 'branch_admin'),
   NULL),
  -- branch_admin @ Branch B
  ('77777777-2222-0000-0000-0000000000b1',
   '77777777-0000-0000-0000-0000000000b1',
   '77777777-1111-0000-0000-0000000000bb',
   (SELECT id FROM core.roles WHERE key = 'branch_admin'),
   NULL),
  -- branch_admin @ Chapter under A
  ('77777777-2222-0000-0000-0000000000c1',
   '77777777-0000-0000-0000-0000000000c1',
   '77777777-1111-0000-0000-0000000000ca',
   (SELECT id FROM core.roles WHERE key = 'branch_admin'),
   NULL),
  -- finance @ Branch A (non-admin role)
  ('77777777-2222-0000-0000-0000000000fa',
   '77777777-0000-0000-0000-0000000000fa',
   '77777777-1111-0000-0000-0000000000ba',
   (SELECT id FROM core.roles WHERE key = 'finance'),
   NULL);

-- Revoked branch_admin @ Branch A. Insert with revoked_at + revoked_by
-- both set at once to satisfy role_assignments_revocation_consistent.
INSERT INTO core.role_assignments
  (id, user_id, scope_id, role_id, granted_by, revoked_at, revoked_by)
VALUES
  ('77777777-2222-0000-0000-0000000000da',
   '77777777-0000-0000-0000-0000000000da',
   '77777777-1111-0000-0000-0000000000ba',
   (SELECT id FROM core.roles WHERE key = 'branch_admin'),
   NULL,
   NOW() - INTERVAL '1 hour',
   '77777777-0000-0000-0000-0000000000aa');

-- Announcements (all status = draft; RLS is orthogonal to status for
-- the admin lens).
INSERT INTO exco.announcements (id, owner_scope_id, title)
VALUES
  ('77777777-3333-0000-0000-0000000000aa',
     '00000000-0000-0000-0000-000000000001', 'Mainstream announcement'),
  ('77777777-3333-0000-0000-0000000000ba',
     '77777777-1111-0000-0000-0000000000ba', 'Branch A announcement'),
  ('77777777-3333-0000-0000-0000000000bb',
     '77777777-1111-0000-0000-0000000000bb', 'Branch B announcement'),
  ('77777777-3333-0000-0000-0000000000ca',
     '77777777-1111-0000-0000-0000000000ca', 'Chapter-under-A announcement');

-------------------------------------------------------------------------------
-- Test 1: sanity — as superuser, all 4 announcements visible (RLS bypassed)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.announcements
   WHERE id::text LIKE '77777777-3333%'),
  4,
  'setup: 4 test announcements created (as superuser, RLS bypassed)'
);

-------------------------------------------------------------------------------
-- Test 2: mainstream_admin sees Mainstream announcement (happy path)
-------------------------------------------------------------------------------

SET LOCAL request.jwt.claim.sub  = '77777777-0000-0000-0000-0000000000aa';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, exco, auth;

SELECT is(
  (SELECT COUNT(*)::int FROM exco.announcements
   WHERE id = '77777777-3333-0000-0000-0000000000aa'),
  1,
  'mainstream_admin @ Mainstream CAN see Mainstream-owned announcement'
);

-------------------------------------------------------------------------------
-- Test 3: mainstream_admin does NOT see Branch announcements
-- (parent → child cascade blocked per ADR-0041)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.announcements
   WHERE id = '77777777-3333-0000-0000-0000000000ba'),
  0,
  'mainstream_admin does NOT see Branch A announcement (parent-child down deny)'
);

-------------------------------------------------------------------------------
-- Test 4: branch_admin @ Branch A sees Branch A announcement (happy)
-------------------------------------------------------------------------------

RESET ROLE;
SET LOCAL request.jwt.claim.sub  = '77777777-0000-0000-0000-0000000000a1';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, exco, auth;

SELECT is(
  (SELECT COUNT(*)::int FROM exco.announcements
   WHERE id = '77777777-3333-0000-0000-0000000000ba'),
  1,
  'branch_admin @ Branch A CAN see Branch A announcement'
);

-------------------------------------------------------------------------------
-- Test 5: branch_admin @ Branch A does NOT see Branch B (sibling deny)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.announcements
   WHERE id = '77777777-3333-0000-0000-0000000000bb'),
  0,
  'branch_admin @ Branch A does NOT see sibling Branch B announcement'
);

-------------------------------------------------------------------------------
-- Test 6: branch_admin @ Branch A does NOT see Chapter-under-A
-- (parent → child cascade blocked per ADR-0041 — this is the assertion
-- most likely to trip a well-meaning "fix" that adds scope traversal)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.announcements
   WHERE id = '77777777-3333-0000-0000-0000000000ca'),
  0,
  'branch_admin @ Branch A does NOT see Chapter-under-A announcement (parent-child down deny)'
);

-------------------------------------------------------------------------------
-- Test 7: branch_admin @ Branch A does NOT see Mainstream
-- (child → parent cascade blocked)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.announcements
   WHERE id = '77777777-3333-0000-0000-0000000000aa'),
  0,
  'branch_admin @ Branch A does NOT see Mainstream announcement (child-parent up deny)'
);

-------------------------------------------------------------------------------
-- Test 8: finance role user sees nothing at Branch A
-- (non-admin role — is_admin_role_key excludes finance)
-------------------------------------------------------------------------------

RESET ROLE;
SET LOCAL request.jwt.claim.sub  = '77777777-0000-0000-0000-0000000000fa';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, exco, auth;

SELECT is(
  (SELECT COUNT(*)::int FROM exco.announcements
   WHERE id = '77777777-3333-0000-0000-0000000000ba'),
  0,
  'finance role does NOT see the Branch A announcement (non-admin role denied)'
);

-------------------------------------------------------------------------------
-- Test 9: revoked branch_admin sees nothing
-------------------------------------------------------------------------------

RESET ROLE;
SET LOCAL request.jwt.claim.sub  = '77777777-0000-0000-0000-0000000000da';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, exco, auth;

SELECT is(
  (SELECT COUNT(*)::int FROM exco.announcements
   WHERE id = '77777777-3333-0000-0000-0000000000ba'),
  0,
  'revoked branch_admin @ Branch A does NOT see Branch A announcement (revoked_at is NOT NULL)'
);

-------------------------------------------------------------------------------
-- Test 10: anon is denied at the grant layer (no SELECT grant)
-- The migration grants SELECT only to `authenticated`. Anon hitting
-- exco.announcements gets permission_denied, not "0 rows via RLS".
-------------------------------------------------------------------------------

RESET ROLE;
SET LOCAL request.jwt.claim.sub  = '';
SET LOCAL request.jwt.claim.role = 'anon';
SET LOCAL ROLE anon;
SET LOCAL search_path = pgtap, public, audit, core, exco, auth;

SELECT throws_ok(
  $$ SELECT COUNT(*) FROM exco.announcements $$,
  '42501',
  NULL,
  'anon role cannot SELECT from exco.announcements (no table grant to anon)'
);

-------------------------------------------------------------------------------
-- Finish
-------------------------------------------------------------------------------

RESET ROLE;
SELECT * FROM finish();

ROLLBACK;
