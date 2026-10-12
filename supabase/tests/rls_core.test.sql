-- pgTAP: RLS policies on core.* tables.
--
-- The point of this file is to exercise BOTH the deny path AND the
-- happy path — a policy that says "deny everyone" passes a
-- deny-only test suite and looks fine until production breaks. So
-- every assertion below has a paired complement.
--
-- search_path discipline: pgTAP functions like `plan` and `lives_ok`
-- internally call helpers (`_set`, etc.) UNQUALIFIED. They resolve via
-- search_path at execution time. And `SET LOCAL ROLE authenticated`
-- reverts search_path to the authenticated role's default (which
-- doesn't include pgtap). So:
--   * `SET LOCAL search_path = ...` at the top of the transaction
--   * Re-`SET LOCAL search_path = ...` after every `SET LOCAL ROLE`
--
-- Test users used here (all rolled back at finish):
--   - 99999999-0000-0000-0000-00000000aaaa : owner of their own profile
--   - 99999999-0000-0000-0000-00000000bbbb : a different user
--   - 99999999-0000-0000-0000-00000000cccc : a granted Mainstream Admin

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, auth;

-- Make pgTAP callable from the `authenticated` role (rolled back with
-- the transaction at finish). Without this, `SET LOCAL ROLE authenticated`
-- leaves the role unable to resolve `lives_ok`, `throws_ok`, etc.
GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(11);

-------------------------------------------------------------------------------
-- Setup (as the default superuser role) — bypasses RLS for state-building
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('99999999-0000-0000-0000-00000000aaaa', 'a@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('99999999-0000-0000-0000-00000000bbbb', 'b@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('99999999-0000-0000-0000-00000000cccc', 'c@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.role_assignments (id, user_id, scope_id, role_id, granted_by)
VALUES (
  '99999999-0000-0000-0000-cccccccccccc',
  '99999999-0000-0000-0000-00000000cccc',
  '00000000-0000-0000-0000-000000000001',                          -- Mainstream
  (SELECT id FROM core.roles WHERE key = 'mainstream_admin'),
  NULL
);

-------------------------------------------------------------------------------
-- A) core.profiles — happy path + deny path
-------------------------------------------------------------------------------

-- Switch into "user A" for the RLS-tested operations.
SET LOCAL request.jwt.claim.sub  = '99999999-0000-0000-0000-00000000aaaa';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, auth;

-- Test 1 (happy): user A can insert their own profile.
SELECT lives_ok(
  $$ INSERT INTO core.profiles (id, display_name, email)
     VALUES ('99999999-0000-0000-0000-00000000aaaa', 'User A', 'a@shesa.test') $$,
  'profiles: user can INSERT their own profile (auth.uid() = id)'
);

-- Test 2 (deny): user A cannot insert a profile for user B.
SELECT throws_ok(
  $$ INSERT INTO core.profiles (id, display_name, email)
     VALUES ('99999999-0000-0000-0000-00000000bbbb', 'User B', 'b@shesa.test') $$,
  '42501',
  NULL,
  'profiles: user cannot INSERT another user''s profile (RLS denies)'
);

-- Test 3 (happy): user A reads their own profile and gets one row.
SELECT is(
  (SELECT COUNT(*)::int FROM core.profiles
   WHERE id = '99999999-0000-0000-0000-00000000aaaa'),
  1,
  'profiles: user can SELECT their own profile'
);

-- Switch to user B (no profile of their own).
RESET ROLE;
SET LOCAL request.jwt.claim.sub = '99999999-0000-0000-0000-00000000bbbb';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, auth;

-- Test 4 (deny): user B reading user A's profile gets zero rows
-- (RLS hides it, doesn't error — that's the SELECT semantic).
SELECT is(
  (SELECT COUNT(*)::int FROM core.profiles
   WHERE id = '99999999-0000-0000-0000-00000000aaaa'),
  0,
  'profiles: user B SELECTing user A''s profile returns 0 rows (RLS filters)'
);

-------------------------------------------------------------------------------
-- B) core.role_assignments — the spec-called-out happy + deny pair
-------------------------------------------------------------------------------

-- Test 5 (deny): user B (no role.grant anywhere) cannot INSERT a
-- role_assignment. This is the failure mode the spec specifically
-- called out.
SELECT throws_ok(
  $$ INSERT INTO core.role_assignments (user_id, scope_id, role_id, granted_by)
     VALUES (
       '99999999-0000-0000-0000-00000000aaaa',
       '00000000-0000-0000-0000-000000000010',
       (SELECT id FROM core.roles WHERE key = 'branch_admin'),
       '99999999-0000-0000-0000-00000000bbbb'
     ) $$,
  '42501',
  NULL,
  'role_assignments: user without role.grant cannot INSERT (deny path)'
);

-- Switch to user C (mainstream_admin → has role.grant via the seeded
-- role_permissions bundle).
RESET ROLE;
SET LOCAL request.jwt.claim.sub = '99999999-0000-0000-0000-00000000cccc';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, auth;

-- Test 6 (happy): admin with role.grant CAN insert.
SELECT lives_ok(
  $$ INSERT INTO core.role_assignments (user_id, scope_id, role_id, granted_by)
     VALUES (
       '99999999-0000-0000-0000-00000000aaaa',
       '00000000-0000-0000-0000-000000000001',
       (SELECT id FROM core.roles WHERE key = 'editor'),
       '99999999-0000-0000-0000-00000000cccc'
     ) $$,
  'role_assignments: admin WITH role.grant CAN INSERT (happy path)'
);

-- Test 7 (happy): scope ancestry — user C's mainstream_admin grant at
-- Mainstream lets them INSERT at the Buea Branch (child) via the
-- has_permission CTE walking UP from Branch to Mainstream.
SELECT lives_ok(
  $$ INSERT INTO core.role_assignments (user_id, scope_id, role_id, granted_by)
     VALUES (
       '99999999-0000-0000-0000-00000000bbbb',
       '00000000-0000-0000-0000-000000000010',
       (SELECT id FROM core.roles WHERE key = 'branch_admin'),
       '99999999-0000-0000-0000-00000000cccc'
     ) $$,
  'role_assignments: ancestry — grant at Mainstream covers INSERT at Buea Branch'
);

-------------------------------------------------------------------------------
-- C) has_permission self-introspection guard
-------------------------------------------------------------------------------

-- Test 8 (happy): user C asking about their own permissions works.
SELECT is(
  core.has_permission(
    '99999999-0000-0000-0000-00000000cccc',
    '00000000-0000-0000-0000-000000000001',
    'role.grant'
  ),
  TRUE,
  'has_permission: caller may check their own permissions'
);

-- Test 9 (deny): user C asking about user A's permissions raises.
SELECT throws_ok(
  $$ SELECT core.has_permission(
       '99999999-0000-0000-0000-00000000aaaa',
       '00000000-0000-0000-0000-000000000001',
       'scope.read'
     ) $$,
  '42501',
  NULL,
  'has_permission: caller cannot check ANOTHER user''s permissions (guard fires)'
);

-------------------------------------------------------------------------------
-- D) core.scopes — open SELECT for authenticated, no client mutation
-------------------------------------------------------------------------------

-- Test 10 (happy): authenticated can SELECT scopes (org chart is public).
SELECT cmp_ok(
  (SELECT COUNT(*)::int FROM core.scopes),
  '>=', 2,
  'scopes: authenticated SELECTs see the seeded scopes'
);

-- Test 11 (deny): authenticated cannot INSERT into core.scopes.
SELECT throws_ok(
  $$ INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id)
     VALUES (
       '99999999-0000-0000-0000-99999999dddd',
       'Rogue Branch', 'rogue-branch', 'branch',
       '00000000-0000-0000-0000-000000000001'
     ) $$,
  '42501',
  NULL,
  'scopes: authenticated cannot INSERT (no INSERT policy = default deny)'
);

SELECT * FROM finish();
ROLLBACK;
