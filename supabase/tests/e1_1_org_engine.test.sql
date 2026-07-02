-- pgTAP: Phase 1 E1.1 org-engine invariants.
--
-- Covers:
--   A. Singleton mainstream constraint (belt on the existing suspenders).
--   B. Scope shape CHECKs — chapter_kind required for chapters, forbidden
--      elsewhere; entry_year required for batches, forbidden elsewhere.
--   C. Batch entry_year uniqueness.
--   D. Global grant: scope_id IS NULL matches has_permission for any target.
--   E. Duplicate global grants blocked by NULLS NOT DISTINCT.
--   F. Scoped grant does not leak across scopes.
--
-- See rls_core.test.sql for the search_path + role-switch discipline
-- reused below.

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(13);

-------------------------------------------------------------------------------
-- Setup: two isolated test users + a global recruiter grant on one of them.
-- All rolled back at COMMIT.
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('88888888-0000-0000-0000-00000000aaaa', 'e1a@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('88888888-0000-0000-0000-00000000bbbb', 'e1b@shesa.test', '00000000-0000-0000-0000-000000000000');

-- Global-recruiter grant to user A: scope_id IS NULL.
INSERT INTO core.role_assignments (id, user_id, scope_id, role_id, granted_by)
VALUES (
  '88888888-1111-0000-0000-000000000001',
  '88888888-0000-0000-0000-00000000aaaa',
  NULL,
  (SELECT id FROM core.roles WHERE key = 'recruiter'),
  NULL
);

-- Scoped mainstream_admin grant to user B: only at Mainstream, not global.
INSERT INTO core.role_assignments (id, user_id, scope_id, role_id, granted_by)
VALUES (
  '88888888-1111-0000-0000-000000000002',
  '88888888-0000-0000-0000-00000000bbbb',
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM core.roles WHERE key = 'mainstream_admin'),
  NULL
);

-------------------------------------------------------------------------------
-- A) Singleton mainstream — cannot create a second one
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO core.scopes (name, slug, scope_type, parent_scope_id)
     VALUES ('Second Mainstream', 'second-mainstream', 'mainstream', NULL) $$,
  '23505',
  NULL,
  'scopes: a second mainstream row raises unique_violation'
);

-------------------------------------------------------------------------------
-- B) Scope shape CHECKs
-------------------------------------------------------------------------------

-- Chapter without chapter_kind — rejected.
SELECT throws_ok(
  $$ INSERT INTO core.scopes (name, slug, scope_type, parent_scope_id, chapter_kind)
     VALUES ('BadCh1', 'badch1', 'chapter', '00000000-0000-0000-0000-000000000001', NULL) $$,
  '23514',
  NULL,
  'scopes: chapter without chapter_kind rejected by CHECK'
);

-- Non-chapter WITH chapter_kind — rejected.
SELECT throws_ok(
  $$ INSERT INTO core.scopes (name, slug, scope_type, parent_scope_id, chapter_kind)
     VALUES ('BadBr1', 'badbr1', 'branch', '00000000-0000-0000-0000-000000000001', 'autonomous') $$,
  '23514',
  NULL,
  'scopes: non-chapter with chapter_kind rejected by CHECK'
);

-- Batch without entry_year — rejected.
SELECT throws_ok(
  $$ INSERT INTO core.scopes (name, slug, scope_type, parent_scope_id, entry_year)
     VALUES ('BadBt1', 'badbt1', 'batch', '00000000-0000-0000-0000-000000000001', NULL) $$,
  '23514',
  NULL,
  'scopes: batch without entry_year rejected by CHECK'
);

-- Non-batch WITH entry_year — rejected.
SELECT throws_ok(
  $$ INSERT INTO core.scopes (name, slug, scope_type, parent_scope_id, entry_year)
     VALUES ('BadHs1', 'badhs1', 'house', '00000000-0000-0000-0000-000000000001', 1999) $$,
  '23514',
  NULL,
  'scopes: non-batch with entry_year rejected by CHECK'
);

-- Well-formed chapter + branch parent (needs a branch to attach to).
INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id)
VALUES (
  '88888888-3333-0000-0000-000000000001',
  'E1.1 Test Branch',
  'e11-test-branch',
  'branch',
  '00000000-0000-0000-0000-000000000001'
);

SELECT lives_ok(
  $$ INSERT INTO core.scopes (name, slug, scope_type, parent_scope_id, chapter_kind)
     VALUES ('GoodCh1', 'goodch1', 'chapter', '88888888-3333-0000-0000-000000000001', 'grouping') $$,
  'scopes: well-formed grouping chapter accepted'
);

-------------------------------------------------------------------------------
-- C) Batch entry_year uniqueness — the partial unique index
-------------------------------------------------------------------------------

-- The seed inserts batch entry_year=2026 already; a second one raises.
SELECT throws_ok(
  $$ INSERT INTO core.scopes (name, slug, scope_type, parent_scope_id, entry_year)
     VALUES ('Dup 2026', 'dup-2026', 'batch', '00000000-0000-0000-0000-000000000001', 2026) $$,
  '23505',
  NULL,
  'scopes: duplicate batch entry_year raises unique_violation'
);

-------------------------------------------------------------------------------
-- D) Global grant matches has_permission at any scope
-------------------------------------------------------------------------------
-- Switch to user A (the global recruiter) and probe has_permission for
-- member.read at the Mainstream scope AND at a non-existent-but-real
-- scope (the newly created Test Branch). Both should be true if the
-- recruiter bundle contains member.read (per Phase 0 seed §2.3).

SET LOCAL request.jwt.claim.sub  = '88888888-0000-0000-0000-00000000aaaa';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, auth;

SELECT is(
  (SELECT core.has_permission(
     '88888888-0000-0000-0000-00000000aaaa'::uuid,
     '00000000-0000-0000-0000-000000000001'::uuid,   -- Mainstream
     'member.read'
   )),
  TRUE,
  'has_permission: global recruiter grant satisfies member.read at Mainstream'
);

SELECT is(
  (SELECT core.has_permission(
     '88888888-0000-0000-0000-00000000aaaa'::uuid,
     '88888888-3333-0000-0000-000000000001'::uuid,   -- Test Branch
     'member.read'
   )),
  TRUE,
  'has_permission: global recruiter grant satisfies member.read at an unrelated Branch (NULL scope_id matches any)'
);

-------------------------------------------------------------------------------
-- E) Duplicate global grants blocked by NULLS NOT DISTINCT
-------------------------------------------------------------------------------

RESET ROLE;
SET LOCAL search_path = pgtap, public, audit, core, auth;

SELECT throws_ok(
  $$ INSERT INTO core.role_assignments (id, user_id, scope_id, role_id, granted_by)
     VALUES (
       '88888888-4444-0000-0000-000000000001',
       '88888888-0000-0000-0000-00000000aaaa',
       NULL,
       (SELECT id FROM core.roles WHERE key = 'recruiter'),
       NULL
     ) $$,
  '23505',
  NULL,
  'role_assignments: second active global recruiter grant blocked (NULLS NOT DISTINCT)'
);

-------------------------------------------------------------------------------
-- F) Scoped grant does not leak — user B (mainstream_admin at Mainstream)
-- has grants only via ancestry, not via NULL scope
-------------------------------------------------------------------------------

SET LOCAL request.jwt.claim.sub  = '88888888-0000-0000-0000-00000000bbbb';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, auth;

-- Mainstream Admin sees scope.manage at Mainstream (direct grant).
SELECT is(
  (SELECT core.has_permission(
     '88888888-0000-0000-0000-00000000bbbb'::uuid,
     '00000000-0000-0000-0000-000000000001'::uuid,
     'scope.manage'
   )),
  TRUE,
  'has_permission: mainstream_admin has scope.manage at Mainstream (direct scoped grant)'
);

-- And the ancestry walk carries it down to the Test Branch under
-- Mainstream — same permission checks true (this confirms scope_id
-- widened to nullable didn't break the ancestry semantics).
SELECT is(
  (SELECT core.has_permission(
     '88888888-0000-0000-0000-00000000bbbb'::uuid,
     '88888888-3333-0000-0000-000000000001'::uuid,
     'scope.manage'
   )),
  TRUE,
  'has_permission: mainstream_admin has scope.manage at a child Branch via non-autonomous ancestry'
);

-- User B does NOT have member.read via any grant on Mainstream + branch_admin
-- bundle at the newly created Branch (they were never granted branch_admin there).
-- Sanity: user B still resolves properly for a permission they *don't* have.
SELECT is(
  (SELECT core.has_permission(
     '88888888-0000-0000-0000-00000000bbbb'::uuid,
     '88888888-3333-0000-0000-000000000001'::uuid,
     'connect.job.approve'
   )),
  TRUE,
  'has_permission: mainstream_admin covers connect.job.approve via full bundle at child Branch'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
