-- pgTAP: RLS on notifications.* and pgmq queue lockdown.
--
-- The properties under test:
--   1. notification_events: recipient sees their own, others don't,
--      and audit.read holders see events scoped to their authority.
--   2. notification_deliveries: same, via the can_view_delivery helper.
--   3. NULL-scope events are service-role-only (no authenticated
--      visibility, even with audit.read).
--   4. Authenticated cannot enqueue to pgmq queues directly.
--
-- Pattern: same search_path + pgtap grants discipline as rls_core.

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, notifications, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(8);

-------------------------------------------------------------------------------
-- Setup (as superuser) — three users, two events, two deliveries
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('99999999-0000-0000-0001-000000000001', 'recipient@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('99999999-0000-0000-0001-000000000002', 'snoop@shesa.test',     '00000000-0000-0000-0000-000000000000'),
  ('99999999-0000-0000-0001-000000000003', 'auditor@shesa.test',   '00000000-0000-0000-0000-000000000000');

-- Auditor: finance role at Mainstream (has audit.read per the seed bundle).
INSERT INTO core.role_assignments (user_id, scope_id, role_id, granted_by)
VALUES (
  '99999999-0000-0000-0001-000000000003',
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM core.roles WHERE key = 'finance'),
  NULL
);

-- Event 1: scoped to Mainstream, recipient is "recipient" user.
INSERT INTO notifications.notification_events (id, event_type, severity, recipient_user_id, scope_id)
VALUES (
  '99999999-0000-0000-0002-000000000001',
  'test.scoped', 'info',
  '99999999-0000-0000-0001-000000000001',
  '00000000-0000-0000-0000-000000000001'
);

-- Event 2: NO scope (system event), recipient is "recipient" user.
INSERT INTO notifications.notification_events (id, event_type, severity, recipient_user_id, scope_id)
VALUES (
  '99999999-0000-0000-0002-000000000002',
  'test.systemic', 'info',
  '99999999-0000-0000-0001-000000000001',
  NULL
);

-- One delivery per event (email channel via stub provider).
INSERT INTO notifications.notification_deliveries (event_id, channel, provider, idempotency_key)
VALUES
  ('99999999-0000-0000-0002-000000000001', 'email', 'stub', '99999999-0000-0000-0002-000000000001:email'),
  ('99999999-0000-0000-0002-000000000002', 'email', 'stub', '99999999-0000-0000-0002-000000000002:email');

-------------------------------------------------------------------------------
-- A) notification_events RLS
-------------------------------------------------------------------------------

-- Recipient sees their own events (both scoped and systemic).
SET LOCAL request.jwt.claim.sub  = '99999999-0000-0000-0001-000000000001';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, notifications, auth;

-- Test 1 (happy): recipient sees both their events.
SELECT is(
  (SELECT COUNT(*)::int FROM notifications.notification_events
   WHERE recipient_user_id = '99999999-0000-0000-0001-000000000001'),
  2,
  'notification_events: recipient SELECTs their own events (scoped + systemic)'
);

-- Switch to snoop user (not the recipient, no audit.read anywhere).
RESET ROLE;
SET LOCAL request.jwt.claim.sub = '99999999-0000-0000-0001-000000000002';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, notifications, auth;

-- Test 2 (deny): snoop user sees zero events that aren't theirs.
SELECT is(
  (SELECT COUNT(*)::int FROM notifications.notification_events
   WHERE event_type IN ('test.scoped', 'test.systemic')),
  0,
  'notification_events: non-recipient with no audit.read sees 0 rows'
);

-- Switch to auditor user (has audit.read at Mainstream via finance role).
RESET ROLE;
SET LOCAL request.jwt.claim.sub = '99999999-0000-0000-0001-000000000003';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, notifications, auth;

-- Test 3 (happy): auditor sees the Mainstream-scoped event.
SELECT cmp_ok(
  (SELECT COUNT(*)::int FROM notifications.notification_events
   WHERE event_type = 'test.scoped'),
  '>=', 1,
  'notification_events: audit.read holder SELECTs scoped events at their scope'
);

-- Test 4 (deny): auditor still does NOT see the NULL-scope (systemic) event.
SELECT is(
  (SELECT COUNT(*)::int FROM notifications.notification_events
   WHERE event_type = 'test.systemic'),
  0,
  'notification_events: NULL-scope events stay service-role-only (auditor blind)'
);

-------------------------------------------------------------------------------
-- B) notification_deliveries RLS — same shape via can_view_delivery
-------------------------------------------------------------------------------

-- Switch back to recipient.
RESET ROLE;
SET LOCAL request.jwt.claim.sub = '99999999-0000-0000-0001-000000000001';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, notifications, auth;

-- Test 5 (happy): recipient sees both of their deliveries via the helper.
SELECT is(
  (SELECT COUNT(*)::int FROM notifications.notification_deliveries
   WHERE event_id IN ('99999999-0000-0000-0002-000000000001', '99999999-0000-0000-0002-000000000002')),
  2,
  'notification_deliveries: recipient SELECTs their deliveries (helper traverses event)'
);

-- Switch back to snoop.
RESET ROLE;
SET LOCAL request.jwt.claim.sub = '99999999-0000-0000-0001-000000000002';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, notifications, auth;

-- Test 6 (deny): snoop sees no deliveries.
SELECT is(
  (SELECT COUNT(*)::int FROM notifications.notification_deliveries
   WHERE event_id IN ('99999999-0000-0000-0002-000000000001', '99999999-0000-0000-0002-000000000002')),
  0,
  'notification_deliveries: non-recipient sees 0 deliveries'
);

-------------------------------------------------------------------------------
-- C) Mutation deny — authenticated cannot INSERT events or deliveries
-------------------------------------------------------------------------------

-- Test 7 (deny): authenticated cannot INSERT notification_events
-- directly. No INSERT policy exists for the authenticated role.
SELECT throws_ok(
  $$ INSERT INTO notifications.notification_events
       (event_type, severity, recipient_user_id)
     VALUES ('test.unauthorized', 'info', '99999999-0000-0000-0001-000000000002') $$,
  '42501',
  NULL,
  'notification_events: authenticated cannot INSERT (no policy = default deny)'
);

-------------------------------------------------------------------------------
-- D) pgmq queue lockdown — authenticated cannot enqueue
-------------------------------------------------------------------------------

-- Test 8 (deny): authenticated cannot call pgmq.send (only service_role
-- has EXECUTE per init_pgmq_queues).
SELECT throws_ok(
  $$ SELECT pgmq.send('notification_dispatch', '{"test":"unauthorized"}'::jsonb) $$,
  '42501',
  NULL,
  'pgmq: authenticated cannot enqueue (service_role only)'
);

SELECT * FROM finish();
ROLLBACK;
