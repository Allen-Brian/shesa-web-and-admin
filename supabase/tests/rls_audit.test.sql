-- pgTAP: RLS on audit.audit_entries.
--
-- The two properties that matter:
--   1. Reads are gated on audit.read at the entry's scope.
--   2. Writes are funneled exclusively through audit.log_event() —
--      direct INSERTs from an authenticated client are denied.
--
-- search_path discipline: see the comment block at the top of
-- rls_core.test.sql for why we re-SET search_path after every
-- `SET LOCAL ROLE`. Short version: switching role wipes search_path
-- to the role's default, and pgTAP's internal helpers (`_set`, etc.)
-- need `pgtap` on path.

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, auth;

-- Make pgTAP callable from the `authenticated` role (rolled back with
-- the transaction at finish). Same fix as rls_core.test.sql.
GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(5);

-------------------------------------------------------------------------------
-- Setup (as the default superuser role) — bypasses RLS for state-building
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('99999999-0000-0000-0000-00000000eeee', 'nopriv@shesa.test',  '00000000-0000-0000-0000-000000000000'),
  ('99999999-0000-0000-0000-00000000ffff', 'auditor@shesa.test', '00000000-0000-0000-0000-000000000000');

-- Grant 'auditor' user the finance role at Mainstream (finance has
-- audit.read per the seeded role_permissions bundle).
INSERT INTO core.role_assignments (user_id, scope_id, role_id, granted_by)
VALUES (
  '99999999-0000-0000-0000-00000000ffff',
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM core.roles WHERE key = 'finance'),
  NULL
);

-- Write two audit entries: one scoped to Mainstream, one with NULL
-- scope (a system event).
SELECT audit.log_event('test.scoped',   'audit', 'audit_entries', NULL, '00000000-0000-0000-0000-000000000001'::uuid);
SELECT audit.log_event('test.systemic', 'audit', 'audit_entries', NULL, NULL);

-------------------------------------------------------------------------------
-- A) Read gating — auditor sees scoped entries; nopriv sees nothing
-------------------------------------------------------------------------------

-- Switch to the auditor user.
SET LOCAL request.jwt.claim.sub  = '99999999-0000-0000-0000-00000000ffff';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, auth;

-- Test 1 (happy): user with audit.read sees scoped entries.
SELECT cmp_ok(
  (SELECT COUNT(*)::int FROM audit.audit_entries WHERE action = 'test.scoped'),
  '>=', 1,
  'audit_entries: user with audit.read SELECTs scoped entries'
);

-- Test 2 (deny): even the auditor cannot see scope_id IS NULL entries.
SELECT is(
  (SELECT COUNT(*)::int FROM audit.audit_entries WHERE action = 'test.systemic'),
  0,
  'audit_entries: authenticated never sees scope_id IS NULL entries (system events service_role-only)'
);

-- Switch to user without audit.read.
RESET ROLE;
SET LOCAL request.jwt.claim.sub = '99999999-0000-0000-0000-00000000eeee';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, auth;

-- Test 3 (deny): user WITHOUT audit.read sees nothing, scoped or not.
SELECT is(
  (SELECT COUNT(*)::int FROM audit.audit_entries WHERE action IN ('test.scoped', 'test.systemic')),
  0,
  'audit_entries: user without audit.read SELECTs 0 rows (RLS filters)'
);

-------------------------------------------------------------------------------
-- B) Direct INSERT denied — helper is the only write path
-------------------------------------------------------------------------------

-- Test 4 (deny): direct INSERT from authenticated is denied.
SELECT throws_ok(
  $$ INSERT INTO audit.audit_entries (action, entity_schema, entity_table)
     VALUES ('test.bypass', 'audit', 'audit_entries') $$,
  '42501',
  NULL,
  'audit_entries: direct INSERT from authenticated is denied (WITH CHECK false)'
);

-- Test 5 (happy): the helper still works for the same user — it
-- inserts as SECURITY DEFINER owner, bypassing the deny policy.
SELECT lives_ok(
  $$ SELECT audit.log_event('test.via_helper', 'audit', 'audit_entries', NULL, '00000000-0000-0000-0000-000000000001'::uuid) $$,
  'audit_entries: audit.log_event still succeeds for the same user (helper bypasses RLS as owner)'
);

SELECT * FROM finish();
ROLLBACK;
