-- pgTAP: Phase 3 M3 contribution lifecycle invariants.
--
-- Exercises the schema-level pieces of M3:
--   * event-tie invariant trigger blocks archiving an event whose
--     contribution has recorded payments
--   * event-tie is scoped narrowly — no payments = archive OK; already-
--     archived contribution = archive OK
--   * contribution_extensions FK cascades on charge delete (the M1 schema
--     shape; exercised via an INSERT after M3 lands)
--   * charges.event_id FK to exco.events restricts a rogue DELETE
--
-- Edge-function lifecycle transitions (draft → open, open → closed,
-- closed → extended → open) run through Deno; their pgTAP coverage
-- would need supabase-functions-runner integration. We test the DB
-- pieces here and the Deno pieces at the app layer.
--
-- Tests:
--   A. events_block_archive trigger BLOCKS when a paid contribution references the event
--   B. events_block_archive trigger ALLOWS archive when no payments recorded
--   C. events_block_archive trigger ALLOWS archive when the referencing contribution is itself archived
--   D. charges.event_id FK RESTRICTs a DELETE on exco.events

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, finance, exco, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(4);

-------------------------------------------------------------------------------
-- Setup — a branch, an event, two contributions (one paid, one dry).
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('aaaaaaaa-0000-0000-0000-00000000aaaa', 'e34a@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES (
  'aaaaaaaa-1111-0000-0000-000000000001',
  'E3.4 Test Branch',
  'e34-test-branch',
  'branch',
  '00000000-0000-0000-0000-000000000001',
  'XAF'
);

INSERT INTO core.members (id, full_name, email, batch_scope_id, house_scope_id, network_scope_id)
VALUES
  ('aaaaaaaa-4444-0000-0000-000000000001', 'E3.4 Member', 'e34m@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
   '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001');

-- Two events.
INSERT INTO exco.events (id, owner_scope_id, name, types, start_at, end_at, venue_name, status)
VALUES
  ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001',
   'E3.4 Paid Event', ARRAY[]::exco.event_type[],
   NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days 3 hours',
   'Community Hall', 'draft'),
  ('aaaaaaaa-2222-0000-0000-000000000002', 'aaaaaaaa-1111-0000-0000-000000000001',
   'E3.4 Dry Event', ARRAY[]::exco.event_type[],
   NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days 3 hours',
   'Community Hall', 'draft');

-- Two goal contributions, each tied to one event.
INSERT INTO finance.charges
  (id, scope_id, shape, name, currency, goal_amount, lifecycle, open_date, close_date, status, event_id)
VALUES
  ('aaaaaaaa-cccc-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001',
   'goal', 'E3.4 Paid Contribution', 'XAF', 100000, 'open',
   NOW(), NOW() + INTERVAL '30 days', 'active',
   'aaaaaaaa-2222-0000-0000-000000000001'),
  ('aaaaaaaa-cccc-0000-0000-000000000002', 'aaaaaaaa-1111-0000-0000-000000000001',
   'goal', 'E3.4 Dry Contribution', 'XAF', 50000, 'open',
   NOW(), NOW() + INTERVAL '30 days', 'active',
   'aaaaaaaa-2222-0000-0000-000000000002');

-- One payment recorded against the paid contribution.
INSERT INTO finance.payments
  (id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by)
VALUES (
  'aaaaaaaa-aaaa-0000-0000-000000000001',
  'aaaaaaaa-cccc-0000-0000-000000000001',
  'aaaaaaaa-1111-0000-0000-000000000001',
  'aaaaaaaa-4444-0000-0000-000000000001',
  20000, 'XAF', 'mtn_momo', 'auto',
  'aaaaaaaa-0000-0000-0000-00000000aaaa'
);

-------------------------------------------------------------------------------
-- A) Event with paid contribution cannot be archived
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ UPDATE exco.events
        SET status = 'archived'
      WHERE id = 'aaaaaaaa-2222-0000-0000-000000000001' $$,
  '23514',
  NULL,
  'exco.events: archiving with a paid contribution raises 23514'
);

-------------------------------------------------------------------------------
-- B) Event with a dry (no-payments) contribution CAN be archived
-------------------------------------------------------------------------------

SELECT lives_ok(
  $$ UPDATE exco.events
        SET status = 'archived'
      WHERE id = 'aaaaaaaa-2222-0000-0000-000000000002' $$,
  'exco.events: archiving with an unpaid contribution succeeds'
);

-------------------------------------------------------------------------------
-- C) Archive the contribution first → the event can then archive
-------------------------------------------------------------------------------
-- The trigger checks lifecycle IN ('open', 'closed'). Archiving the
-- contribution lifts the block; the event's archive can then proceed.

UPDATE finance.charges
   SET lifecycle = 'archived'
 WHERE id = 'aaaaaaaa-cccc-0000-0000-000000000001';

SELECT lives_ok(
  $$ UPDATE exco.events
        SET status = 'archived'
      WHERE id = 'aaaaaaaa-2222-0000-0000-000000000001' $$,
  'exco.events: archiving succeeds once the referenced contribution is itself archived'
);

-------------------------------------------------------------------------------
-- D) FK RESTRICT — cannot DELETE an event that a contribution references
-------------------------------------------------------------------------------
-- Set up a fresh event + contribution pair (the previous set has been
-- through several UPDATEs). RESTRICT should raise 23503 on DELETE.

INSERT INTO exco.events (id, owner_scope_id, name, types, start_at, end_at, venue_name, status)
VALUES (
  'aaaaaaaa-2222-0000-0000-000000000003',
  'aaaaaaaa-1111-0000-0000-000000000001',
  'E3.4 FK Test Event',
  ARRAY[]::exco.event_type[],
  NOW() + INTERVAL '21 days',
  NOW() + INTERVAL '21 days 3 hours',
  'Community Hall',
  'draft'
);

INSERT INTO finance.charges
  (id, scope_id, shape, name, currency, goal_amount, lifecycle, open_date, close_date, status, event_id)
VALUES (
  'aaaaaaaa-cccc-0000-0000-000000000003',
  'aaaaaaaa-1111-0000-0000-000000000001',
  'goal', 'E3.4 FK Test Contribution', 'XAF', 25000, 'draft',
  NOW(), NOW() + INTERVAL '30 days', 'active',
  'aaaaaaaa-2222-0000-0000-000000000003'
);

SELECT throws_ok(
  $$ DELETE FROM exco.events WHERE id = 'aaaaaaaa-2222-0000-0000-000000000003' $$,
  '23503',
  NULL,
  'exco.events: DELETE blocked by charges.event_id FK RESTRICT'
);

SELECT * FROM finish();
ROLLBACK;
