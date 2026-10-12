-- pgTAP: Phase 1 E1.5 six-holder cap + global grant.
--
-- Covers:
--   A. Six admin+finance grants at the same branch → seventh raises
--      CAP_EXCEEDED (SQLSTATE 23514, message-prefix CAP_EXCEEDED).
--   B. Revoked/expired grants don't count toward the cap — after
--      revoking one of the six, a seventh grant succeeds.
--   C. Global recruiter grants (scope_id IS NULL) don't count toward
--      any per-scope cap.
--   D. Cap is per-scope — the same six holders at Branch A leave
--      Branch B's cap untouched.
--   E. Non-admin/finance roles (editor, announcer, recruiter at scope)
--      don't count toward the cap.

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(6);

-------------------------------------------------------------------------------
-- Setup — two branches + eight users
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id)
SELECT
  ('44444444-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'e5-' || n || '@shesa.test',
  '00000000-0000-0000-0000-000000000000'
FROM generate_series(1, 8) AS n;

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id)
VALUES
  ('44444444-1111-0000-0000-000000000001', 'E1.5 Branch A', 'e15-branch-a', 'branch',
   '00000000-0000-0000-0000-000000000001'),
  ('44444444-1111-0000-0000-000000000002', 'E1.5 Branch B', 'e15-branch-b', 'branch',
   '00000000-0000-0000-0000-000000000001');

-------------------------------------------------------------------------------
-- A) Six admin+finance at Branch A → seventh raises
-------------------------------------------------------------------------------
-- Grant six: three branch_admin + three finance (any mix works — the
-- cap is combined).

INSERT INTO core.role_assignments (user_id, scope_id, role_id, granted_by)
SELECT
  ('44444444-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '44444444-1111-0000-0000-000000000001',
  (SELECT id FROM core.roles WHERE key = CASE WHEN n <= 3 THEN 'branch_admin' ELSE 'finance' END),
  NULL
FROM generate_series(1, 6) AS n;

SELECT throws_ok(
  $$ INSERT INTO core.role_assignments (user_id, scope_id, role_id, granted_by)
     VALUES (
       '44444444-0000-0000-0000-000000000007',
       '44444444-1111-0000-0000-000000000001',
       (SELECT id FROM core.roles WHERE key = 'branch_admin'),
       NULL
     ) $$,
  '23514',
  NULL,
  'six-holder cap: seventh admin+finance grant at same scope raises 23514'
);

-------------------------------------------------------------------------------
-- B) Revoked grants don't count — revoke one, seventh succeeds
-------------------------------------------------------------------------------

-- Revocation CHECK requires revoked_at AND revoked_by set together —
-- use one of the seeded test users as the revoker.
UPDATE core.role_assignments
   SET revoked_at = NOW(), revoked_by = '44444444-0000-0000-0000-000000000002'
 WHERE user_id = '44444444-0000-0000-0000-000000000001'
   AND scope_id = '44444444-1111-0000-0000-000000000001';

SELECT lives_ok(
  $$ INSERT INTO core.role_assignments (user_id, scope_id, role_id, granted_by)
     VALUES (
       '44444444-0000-0000-0000-000000000007',
       '44444444-1111-0000-0000-000000000001',
       (SELECT id FROM core.roles WHERE key = 'branch_admin'),
       NULL
     ) $$,
  'six-holder cap: after revoking one holder, seventh grant succeeds'
);

-------------------------------------------------------------------------------
-- C) Global recruiter grants (scope_id IS NULL) don't count
-------------------------------------------------------------------------------
-- Even with six admin+finance still at Branch A (post revoke + new grant),
-- adding a global recruiter for a completely different user must succeed
-- because the trigger short-circuits on scope_id IS NULL.

SELECT lives_ok(
  $$ INSERT INTO core.role_assignments (user_id, scope_id, role_id, granted_by)
     VALUES (
       '44444444-0000-0000-0000-000000000008',
       NULL,
       (SELECT id FROM core.roles WHERE key = 'recruiter'),
       NULL
     ) $$,
  'six-holder cap: global grant (scope_id IS NULL) exempt from cap'
);

-------------------------------------------------------------------------------
-- D) Cap is per-scope — Branch B untouched
-------------------------------------------------------------------------------

SELECT lives_ok(
  $$ INSERT INTO core.role_assignments (user_id, scope_id, role_id, granted_by)
     VALUES (
       '44444444-0000-0000-0000-000000000001',
       '44444444-1111-0000-0000-000000000002',
       (SELECT id FROM core.roles WHERE key = 'branch_admin'),
       NULL
     ) $$,
  'six-holder cap: per-scope, Branch B untouched by Branch A saturation'
);

-------------------------------------------------------------------------------
-- E) Non-admin/finance grants don't count
-------------------------------------------------------------------------------
-- Insert 6 editor grants at Branch A on top of the existing 6 admin/finance
-- — editors don't count so this should succeed.

SELECT lives_ok(
  $$ INSERT INTO core.role_assignments (user_id, scope_id, role_id, granted_by)
     SELECT
       ('44444444-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       '44444444-1111-0000-0000-000000000001',
       (SELECT id FROM core.roles WHERE key = 'editor'),
       NULL
     FROM generate_series(1, 6) AS n $$,
  'six-holder cap: editor grants at a saturated scope succeed (only admin+finance count)'
);

-------------------------------------------------------------------------------
-- F) has_permission via global grant — user with global recruiter (member.read
-- in the bundle) sees member.read at any scope
-------------------------------------------------------------------------------

SET LOCAL request.jwt.claim.sub  = '44444444-0000-0000-0000-000000000008';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, auth;

SELECT is(
  (SELECT core.has_permission(
     '44444444-0000-0000-0000-000000000008'::uuid,
     '44444444-1111-0000-0000-000000000002'::uuid,
     'member.read'
   )),
  TRUE,
  'has_permission: global recruiter (NULL scope) satisfies member.read at any concrete scope'
);

SELECT * FROM finish();
ROLLBACK;
