-- pgTAP: the audit mirror trigger on core.role_assignments.
--
-- Confirms the invariant: you cannot INSERT or UPDATE a role assignment
-- without it producing BOTH an audit.audit_entries row AND a
-- core.role_history row — and that role_history is itself append-only.
--
-- These tests rely on the seeded scopes + roles. They create a test
-- user in auth.users, exercise the trigger, and rollback at the end so
-- nothing persists.

BEGIN;
SET search_path = pgtap, public, core, audit, auth;

SELECT plan(8);

-------------------------------------------------------------------------------
-- Fixtures: a test user (rolled back at the end of this transaction).
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, aud, role)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'pgtap-test@shesa.test',
  'authenticated',
  'authenticated'
);

-- Capture the seeded Mainstream scope + mainstream_admin role IDs so
-- subsequent INSERTs and assertions reference real data.
DO $$
DECLARE
  v_role_id  UUID := (SELECT id FROM core.roles  WHERE key = 'mainstream_admin');
  v_scope_id UUID := '00000000-0000-0000-0000-000000000001'::uuid; -- Shesa Mainstream
  v_user_id  UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  v_assignment_id UUID;
BEGIN
  PERFORM set_config('test.role_id', v_role_id::text, true);
  PERFORM set_config('test.scope_id', v_scope_id::text, true);
  PERFORM set_config('test.user_id', v_user_id::text, true);
END $$;

-------------------------------------------------------------------------------
-- 1. Inserting a role_assignment produces a role.granted audit entry
-------------------------------------------------------------------------------

-- Baseline counts BEFORE the insert.
DO $$
BEGIN
  PERFORM set_config(
    'test.audit_count_before',
    (SELECT COUNT(*)::text FROM audit.audit_entries WHERE action = 'role.granted'),
    true
  );
  PERFORM set_config(
    'test.history_count_before',
    (SELECT COUNT(*)::text FROM core.role_history WHERE action = 'granted'),
    true
  );
END $$;

-- The actual INSERT — trigger fires here.
INSERT INTO core.role_assignments (id, user_id, scope_id, role_id, granted_by)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  current_setting('test.user_id')::uuid,
  current_setting('test.scope_id')::uuid,
  current_setting('test.role_id')::uuid,
  current_setting('test.user_id')::uuid  -- self-grant for the test
);

SELECT cmp_ok(
  (SELECT COUNT(*) FROM audit.audit_entries WHERE action = 'role.granted')::int,
  '=',
  current_setting('test.audit_count_before')::int + 1,
  'INSERT into role_assignments wrote one audit.audit_entries row'
);

SELECT cmp_ok(
  (SELECT COUNT(*) FROM core.role_history WHERE action = 'granted')::int,
  '=',
  current_setting('test.history_count_before')::int + 1,
  'INSERT into role_assignments wrote one core.role_history granted row'
);

-- The history row references the audit entry.
SELECT isnt(
  (SELECT audit_entry_id FROM core.role_history WHERE role_assignment_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid AND action = 'granted'),
  NULL,
  'role_history.audit_entry_id is populated (bridge to central audit log)'
);

-------------------------------------------------------------------------------
-- 2. Revoking sets revoked_at AND produces a role.revoked audit entry
-------------------------------------------------------------------------------

-- Phase 2 last-admin protection: the trigger blocks revoking the only
-- active admin at a scope. Insert a companion mainstream_admin so the
-- revocation below leaves one active admin — the mirror trigger is
-- what this test is actually exercising.
INSERT INTO auth.users (id, email, instance_id) VALUES
  ('99999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'companion@shesa.test', '00000000-0000-0000-0000-000000000000')
ON CONFLICT DO NOTHING;

INSERT INTO core.role_assignments (id, user_id, scope_id, role_id, granted_by)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb9',
  '99999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  current_setting('test.scope_id')::uuid,
  current_setting('test.role_id')::uuid,
  current_setting('test.user_id')::uuid
) ON CONFLICT DO NOTHING;

UPDATE core.role_assignments
SET revoked_at = NOW(),
    revoked_by = current_setting('test.user_id')::uuid
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';

SELECT cmp_ok(
  (SELECT COUNT(*) FROM audit.audit_entries WHERE action = 'role.revoked')::int,
  '>=', 1,
  'UPDATE setting revoked_at wrote a role.revoked audit row'
);

SELECT cmp_ok(
  (SELECT COUNT(*) FROM core.role_history WHERE action = 'revoked' AND role_assignment_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid)::int,
  '=', 1,
  'UPDATE setting revoked_at wrote one role_history revoked row'
);

-- prior_snapshot captures the pre-revoke row.
SELECT isnt(
  (SELECT prior_snapshot FROM core.role_history WHERE role_assignment_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid AND action = 'revoked'),
  NULL,
  'revoked role_history row contains prior_snapshot of the pre-revoke state'
);

-------------------------------------------------------------------------------
-- 3. role_history is itself append-only
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ UPDATE core.role_history SET action = 'tampered' WHERE role_assignment_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid $$,
  '42501',
  NULL,
  'UPDATE on core.role_history raises 42501'
);

SELECT throws_ok(
  $$ DELETE FROM core.role_history WHERE role_assignment_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid $$,
  '42501',
  NULL,
  'DELETE on core.role_history raises 42501'
);

SELECT * FROM finish();
ROLLBACK;
