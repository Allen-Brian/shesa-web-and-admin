-- pgTAP: Phase 3 M4B payment intents invariants.
--
-- The initiate + confirm edge functions live in Deno; this file
-- exercises the DB-level pieces of the intent flow:
--
--   * payment_intent_status enum has the four values in order.
--   * CHECK payment_intents_targets_something rejects (obligation_id
--     NULL AND charge_id NULL).
--   * CHECK payment_intents_settlement_matches_mode rejects a succeeded
--     live row without resulting_payment_id. (It replaced
--     payment_intents_terminal_has_resulting_payment when sandbox mode
--     landed; the mode-specific halves are covered in
--     e3_15_payment_modes.test.sql.)
--   * RLS: finance role at scope CAN SELECT; unrelated user CANNOT.
--   * Full happy path: insert intent → insert payment (as confirm does)
--     + update intent to succeeded → obligation transitions via the M4A
--     recompute trigger.

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(8);

-------------------------------------------------------------------------------
-- Setup
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('cccccccc-0000-0000-0000-00000000aaaa', 'e36a@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('cccccccc-0000-0000-0000-00000000bbbb', 'e36b@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES (
  'cccccccc-1111-0000-0000-000000000001',
  'E3.6 Test Branch',
  'e36-test-branch',
  'branch',
  '00000000-0000-0000-0000-000000000001',
  'XAF'
);

INSERT INTO core.members (id, full_name, email, batch_scope_id, house_scope_id, network_scope_id)
VALUES
  ('cccccccc-4444-0000-0000-000000000001', 'E3.6 Member', 'e36m@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
   '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001');

INSERT INTO finance.charges
  (id, scope_id, shape, name, base_amount, currency, recurrence, activation_date, status)
VALUES
  ('cccccccc-cccc-0000-0000-000000000001', 'cccccccc-1111-0000-0000-000000000001',
   'charge', 'E3.6 Dues', 20000, 'XAF', 'monthly', '2027-01-01T00:00:00Z', 'active');

INSERT INTO finance.obligations
  (id, charge_id, scope_id, party_type, party_id, amount, currency, status, period_start)
VALUES
  ('cccccccc-bbbb-0000-0000-000000000001', 'cccccccc-cccc-0000-0000-000000000001',
   'cccccccc-1111-0000-0000-000000000001', 'member', 'cccccccc-4444-0000-0000-000000000001',
   20000, 'XAF', 'open', '2027-01-01');

-- Finance role at test branch for user A (RLS positive control).
INSERT INTO core.role_assignments (id, user_id, role_id, scope_id, starts_at)
SELECT
  'cccccccc-2222-0000-0000-000000000001',
  'cccccccc-0000-0000-0000-00000000aaaa',
  r.id,
  'cccccccc-1111-0000-0000-000000000001',
  NOW()
FROM core.roles r WHERE r.key = 'finance';

-------------------------------------------------------------------------------
-- A) payment_intent_status has the four values in order
-------------------------------------------------------------------------------

-- The lifecycle in order. `initiated` was added on 2026-09-03 and sorts
-- before `pending`, because an intent exists from the moment the row is
-- written — before the gateway has been called at all.
--
-- A trailing `expired` label survives from the Fapshi integration:
-- Postgres cannot drop an enum label without recreating the type, so the
-- removal migration left it in place unused. Asserting a prefix rather
-- than equality keeps this test honest either way.
SELECT is(
  (SELECT array_agg(enumlabel::text ORDER BY enumsortorder)
   FROM pg_enum e
   INNER JOIN pg_type t ON t.oid = e.enumtypid
   INNER JOIN pg_namespace n ON n.oid = t.typnamespace
   WHERE t.typname = 'payment_intent_status' AND n.nspname = 'finance')
    [1:5],
  ARRAY['initiated', 'pending', 'succeeded', 'failed', 'cancelled']::text[],
  'finance.payment_intent_status enum leads with the five lifecycle values in order'
);

-------------------------------------------------------------------------------
-- B) CHECK targets_something rejects (obligation NULL AND charge NULL)
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO finance.payment_intents
       (scope_id, amount, currency, method, available_from, mode)
     VALUES
       ('cccccccc-1111-0000-0000-000000000001', 5000, 'XAF', 'cash', NOW(), 'live') $$,
  '23514',
  NULL,
  'payment_intents: NULL obligation AND NULL charge raises 23514'
);

-------------------------------------------------------------------------------
-- C) CHECK settlement_matches_mode rejects succeeded w/o a settlement
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO finance.payment_intents
       (obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, status, available_from, mode)
     VALUES
       ('cccccccc-bbbb-0000-0000-000000000001',
        'cccccccc-cccc-0000-0000-000000000001',
        'cccccccc-1111-0000-0000-000000000001',
        'cccccccc-4444-0000-0000-000000000001',
        20000, 'XAF', 'mtn_momo', 'succeeded', NOW(), 'live') $$,
  '23514',
  NULL,
  'payment_intents: status=succeeded without resulting_payment_id raises 23514'
);

-------------------------------------------------------------------------------
-- D) Happy path — insert intent, then run a simulated confirm
-------------------------------------------------------------------------------

-- Insert a pending intent whose available_from is already past.
INSERT INTO finance.payment_intents
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method,
   status, available_from, created_by, mode)
VALUES (
  'cccccccc-dddd-0000-0000-000000000001',
  'cccccccc-bbbb-0000-0000-000000000001',
  'cccccccc-cccc-0000-0000-000000000001',
  'cccccccc-1111-0000-0000-000000000001',
  'cccccccc-4444-0000-0000-000000000001',
  20000, 'XAF', 'mtn_momo',
  'pending', NOW() - INTERVAL '1 second',
  'cccccccc-0000-0000-0000-00000000aaaa',
  'live'
);

SELECT is(
  (SELECT status::text FROM finance.payment_intents WHERE id = 'cccccccc-dddd-0000-0000-000000000001'),
  'pending',
  'payment_intents: initial insert leaves status=pending'
);

-- Simulate what confirm() does on success: INSERT a payment row + UPDATE
-- the intent to succeeded + resulting_payment_id.
INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by)
VALUES (
  'cccccccc-aaaa-0000-0000-000000000001',
  'cccccccc-bbbb-0000-0000-000000000001',
  'cccccccc-cccc-0000-0000-000000000001',
  'cccccccc-1111-0000-0000-000000000001',
  'cccccccc-4444-0000-0000-000000000001',
  20000, 'XAF', 'mtn_momo', 'auto',
  'cccccccc-0000-0000-0000-00000000aaaa'
);

UPDATE finance.payment_intents
   SET status = 'succeeded',
       resulting_payment_id = 'cccccccc-aaaa-0000-0000-000000000001'
 WHERE id = 'cccccccc-dddd-0000-0000-000000000001';

SELECT is(
  (SELECT status::text FROM finance.payment_intents WHERE id = 'cccccccc-dddd-0000-0000-000000000001'),
  'succeeded',
  'payment_intents: transition to succeeded with resulting_payment_id succeeds'
);

-- The M4A recompute trigger should have fired on the payment INSERT
-- and transitioned the obligation to 'paid'.
SELECT is(
  (SELECT status::text FROM finance.obligations WHERE id = 'cccccccc-bbbb-0000-0000-000000000001'),
  'paid',
  'M4A recompute trigger fires from M4B confirm path: obligation → paid'
);

-------------------------------------------------------------------------------
-- E) RLS — finance role at scope CAN SELECT the intent
-------------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;
SET LOCAL request.jwt.claim.sub = 'cccccccc-0000-0000-0000-00000000aaaa';
SET LOCAL request.jwt.claims = '{"sub":"cccccccc-0000-0000-0000-00000000aaaa","role":"authenticated"}';

SELECT cmp_ok(
  (SELECT COUNT(*)::int FROM finance.payment_intents WHERE scope_id = 'cccccccc-1111-0000-0000-000000000001'),
  '>',
  0,
  'RLS: finance role at scope CAN SELECT payment_intents'
);

-------------------------------------------------------------------------------
-- F) RLS — unrelated authenticated user CANNOT SELECT
-------------------------------------------------------------------------------

SET LOCAL request.jwt.claim.sub = 'cccccccc-0000-0000-0000-00000000bbbb';
SET LOCAL request.jwt.claims = '{"sub":"cccccccc-0000-0000-0000-00000000bbbb","role":"authenticated"}';

SELECT is(
  (SELECT COUNT(*)::int FROM finance.payment_intents WHERE scope_id = 'cccccccc-1111-0000-0000-000000000001'),
  0,
  'RLS: unrelated authenticated user sees zero payment_intents'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
