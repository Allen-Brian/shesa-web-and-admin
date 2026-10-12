-- pgTAP: Phase 1 E1.6 position invariants.
--
-- Covers:
--   A. Catalog uniqueness — (scope_type, LOWER(name)) unique.
--   B. Catalog scope_type restriction — house/network rejected by CHECK.
--   C. Assignment scope-type match — Branch position on a chapter rejected.
--   D. One active assignment per (member, scope, position).
--   E. President trigger fires an in-app notification when the assigned
--      member has no admin role.
--   F. President trigger does NOT fire when the member already holds
--      an active admin role at the scope.
--   G. President trigger writes NO delivery row (in-app-only).

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, auth, notifications;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(9);

-------------------------------------------------------------------------------
-- Setup — a branch, a member, an assigner user
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('33333333-0000-0000-0000-00000000aaaa', 'e6-assigner@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('33333333-0000-0000-0000-00000000bbbb', 'e6-existing-admin@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id)
VALUES (
  '33333333-1111-0000-0000-000000000001', 'E1.6 Test Branch', 'e16-test-branch', 'branch',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO core.members (id, full_name, email, batch_scope_id, house_scope_id, network_scope_id)
VALUES
  (
    '33333333-4444-0000-0000-000000000001', 'E1.6 Member No Admin', 'e16-noadmin@shesa.test',
    (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
    '33333333-0000-0000-0000-000000000001',
    '44444444-0000-0000-0000-000000000001'
  ),
  (
    '33333333-4444-0000-0000-000000000002', 'E1.6 Member With Admin', 'e16-withadmin@shesa.test',
    (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
    '33333333-0000-0000-0000-000000000001',
    '44444444-0000-0000-0000-000000000001'
  );

-- Link the second member to a user + give them branch_admin at Branch A.
INSERT INTO core.member_accounts (member_id, auth_user_id, claim_status, invited_at, claimed_at)
VALUES (
  '33333333-4444-0000-0000-000000000002',
  '33333333-0000-0000-0000-00000000bbbb',
  'claimed', NOW() - interval '1 day', NOW()
);

INSERT INTO core.role_assignments (user_id, scope_id, role_id, granted_by)
VALUES (
  '33333333-0000-0000-0000-00000000bbbb',
  '33333333-1111-0000-0000-000000000001',
  (SELECT id FROM core.roles WHERE key = 'branch_admin'),
  NULL
);

-------------------------------------------------------------------------------
-- A) Catalog uniqueness — duplicate (scope_type, name) rejected
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO core.position_catalog (scope_type, name)
     VALUES ('branch', 'president') $$,
  '23505',
  NULL,
  'position_catalog: duplicate (scope_type, LOWER(name)) rejected'
);

-------------------------------------------------------------------------------
-- B) Catalog scope_type restriction — house rejected
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO core.position_catalog (scope_type, name)
     VALUES ('house', 'Custodian') $$,
  '23514',
  NULL,
  'position_catalog: scope_type=house rejected by CHECK'
);

-------------------------------------------------------------------------------
-- C) Assignment scope-type match — Branch position on a chapter rejected
-------------------------------------------------------------------------------

-- Insert an autonomous chapter for the mismatch test.
INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, chapter_kind)
VALUES (
  '33333333-1111-0000-0000-000000000002', 'E1.6 Test Chapter', 'e16-test-chapter', 'chapter',
  '33333333-1111-0000-0000-000000000001', 'autonomous'
);

SELECT throws_ok(
  format(
    $$ INSERT INTO core.position_assignments (
         member_id, scope_id, position_catalog_id, assigned_by
       ) VALUES (%L, %L, %L, %L) $$,
    '33333333-4444-0000-0000-000000000001',
    '33333333-1111-0000-0000-000000000002',                                             -- chapter
    (SELECT id FROM core.position_catalog WHERE scope_type='branch' AND name='President'),  -- branch position
    '33333333-0000-0000-0000-00000000aaaa'
  ),
  '23514',
  NULL,
  'position_assignments: catalog scope_type mismatch rejected by trigger'
);

-------------------------------------------------------------------------------
-- D) One active assignment per (member, scope, position)
-------------------------------------------------------------------------------

-- First assignment — Secretary of Branch A (does NOT trigger president prompt).
INSERT INTO core.position_assignments (
  member_id, scope_id, position_catalog_id, assigned_by
) VALUES (
  '33333333-4444-0000-0000-000000000001',
  '33333333-1111-0000-0000-000000000001',
  (SELECT id FROM core.position_catalog WHERE scope_type='branch' AND name='Secretary'),
  '33333333-0000-0000-0000-00000000aaaa'
);

-- Second attempt at the same (member, scope, position) — rejected.
SELECT throws_ok(
  format(
    $$ INSERT INTO core.position_assignments (
         member_id, scope_id, position_catalog_id, assigned_by
       ) VALUES (%L, %L, %L, %L) $$,
    '33333333-4444-0000-0000-000000000001',
    '33333333-1111-0000-0000-000000000001',
    (SELECT id FROM core.position_catalog WHERE scope_type='branch' AND name='Secretary'),
    '33333333-0000-0000-0000-00000000aaaa'
  ),
  '23505',
  NULL,
  'position_assignments: second active position at same (member, scope) rejected (Phase 2 §7 one-per-body)'
);

-------------------------------------------------------------------------------
-- E) President trigger fires in-app notification when member has no admin
-------------------------------------------------------------------------------

-- Baseline: no president_needs_admin event yet.
SELECT is(
  (SELECT COUNT(*)::int FROM notifications.notification_events
   WHERE event_type = 'position.president_needs_admin'
     AND (payload->>'member_id') = '33333333-4444-0000-0000-000000000001'),
  0,
  'president trigger: baseline zero notifications for member-no-admin'
);

-- Phase 2 §7 tightened positions to one-per-body. Remove the earlier
-- Secretary assignment before promoting the same member to President
-- at Branch A so we don't collide with the tightened partial unique.
UPDATE core.position_assignments
   SET removed_at = NOW(), removed_by = '33333333-0000-0000-0000-00000000aaaa'
 WHERE member_id = '33333333-4444-0000-0000-000000000001'
   AND scope_id = '33333333-1111-0000-0000-000000000001'
   AND removed_at IS NULL;

-- Assign President of Branch A to the no-admin member.
INSERT INTO core.position_assignments (
  member_id, scope_id, position_catalog_id, assigned_by
) VALUES (
  '33333333-4444-0000-0000-000000000001',
  '33333333-1111-0000-0000-000000000001',
  (SELECT id FROM core.position_catalog WHERE scope_type='branch' AND name='President'),
  '33333333-0000-0000-0000-00000000aaaa'
);

SELECT is(
  (SELECT COUNT(*)::int FROM notifications.notification_events
   WHERE event_type = 'position.president_needs_admin'
     AND recipient_user_id = '33333333-0000-0000-0000-00000000aaaa'
     AND (payload->>'member_id') = '33333333-4444-0000-0000-000000000001'
     AND payload->>'channel' = 'in_app'),
  1,
  'president trigger: one in-app notification enqueued to the assigner when member has no admin'
);

-------------------------------------------------------------------------------
-- F) President trigger does NOT fire when member already holds admin
-------------------------------------------------------------------------------

INSERT INTO core.position_assignments (
  member_id, scope_id, position_catalog_id, assigned_by
) VALUES (
  '33333333-4444-0000-0000-000000000002',                                       -- has branch_admin
  '33333333-1111-0000-0000-000000000001',
  (SELECT id FROM core.position_catalog WHERE scope_type='branch' AND name='President'),
  '33333333-0000-0000-0000-00000000aaaa'
);

SELECT is(
  (SELECT COUNT(*)::int FROM notifications.notification_events
   WHERE event_type = 'position.president_needs_admin'
     AND (payload->>'member_id') = '33333333-4444-0000-0000-000000000002'),
  0,
  'president trigger: NO notification when member already holds branch_admin at the scope'
);

-------------------------------------------------------------------------------
-- G) President trigger writes NO delivery row (in-app-only)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM notifications.notification_deliveries d
     INNER JOIN notifications.notification_events e ON e.id = d.event_id
   WHERE e.event_type = 'position.president_needs_admin'),
  0,
  'president trigger: NO email/sms delivery rows created (in-app-only)'
);

-------------------------------------------------------------------------------
-- H) No admin role auto-granted by the trigger
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM core.role_assignments ra
     INNER JOIN core.roles r ON r.id = ra.role_id
     INNER JOIN core.member_accounts ma ON ma.auth_user_id = ra.user_id
   WHERE ma.member_id = '33333333-4444-0000-0000-000000000001'
     AND r.key IN ('mainstream_admin', 'branch_admin')
     AND ra.revoked_at IS NULL),
  0,
  'president trigger: NO admin role auto-granted (human operator decides)'
);

SELECT * FROM finish();
ROLLBACK;
