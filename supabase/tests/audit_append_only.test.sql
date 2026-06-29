-- pgTAP: audit.audit_entries is append-only.
--
-- Confirms the trigger-based UPDATE/DELETE block works regardless of
-- whether the caller goes through audit.log_event or attempts a direct
-- mutation. This is the safety property that makes audit trustworthy:
-- a compromised user with full table access still cannot rewrite history.

BEGIN;
SET search_path = pgtap, public, audit, core;

SELECT plan(6);

-------------------------------------------------------------------------------
-- 1. log_event happy path — returns a UUID, row exists
-------------------------------------------------------------------------------

SELECT lives_ok(
  $$ SELECT audit.log_event('auth.login', 'auth', 'users', '00000000-0000-0000-0000-000000000099'::uuid) $$,
  'audit.log_event with minimal args succeeds'
);

-- Capture the id of an entry we just wrote so the next tests can target
-- a known row.
DO $$
BEGIN
  PERFORM audit.log_event(
    'auth.login',
    'auth', 'users',
    '00000000-0000-0000-0000-000000000099'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '{"source":"pgtap"}'::jsonb
  );
END $$;

SELECT cmp_ok(
  (SELECT COUNT(*) FROM audit.audit_entries WHERE action = 'auth.login')::int,
  '>=', 1,
  'log_event wrote at least one auth.login row'
);

-------------------------------------------------------------------------------
-- 2. UPDATE on audit_entries raises with 42501
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ UPDATE audit.audit_entries SET action = 'tampered' WHERE action = 'auth.login' $$,
  '42501',
  NULL,
  'UPDATE on audit_entries raises 42501 (insufficient_privilege)'
);

-------------------------------------------------------------------------------
-- 3. DELETE on audit_entries raises with 42501
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ DELETE FROM audit.audit_entries WHERE action = 'auth.login' $$,
  '42501',
  NULL,
  'DELETE on audit_entries raises 42501 (insufficient_privilege)'
);

-------------------------------------------------------------------------------
-- 4. log_event validates required args
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ SELECT audit.log_event(NULL, 'auth', 'users') $$,
  '22023',
  NULL,
  'log_event with NULL action raises 22023 (invalid_parameter_value)'
);

SELECT throws_ok(
  $$ SELECT audit.log_event('auth.login', NULL, 'users') $$,
  '22023',
  NULL,
  'log_event with NULL entity_schema raises 22023'
);

SELECT * FROM finish();
ROLLBACK;
