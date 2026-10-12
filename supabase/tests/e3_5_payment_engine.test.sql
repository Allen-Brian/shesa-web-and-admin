-- pgTAP: Phase 3 M4 payment engine invariants.
--
-- Covers the DB-side pieces of M4A:
--   * The obligation status trigger fires open → partial → paid as
--     payments land and reverses.
--   * Terminal statuses (cancelled / forgiven) are preserved even if a
--     late payment arrives.
--   * M1 append-only trigger still fires from the M4 code path.
--   * Reversals reduce the paid sum via the not-exists subquery.
--   * A CHECK enforces reverses_payment_id + reversal_reason arrive
--     together.
--
-- The edge-function permission gates are exercised at the app layer
-- (Deno tests + integration tests); pgTAP here focuses on the DB
-- invariants that hold regardless of which layer wrote the row.

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(10);

-------------------------------------------------------------------------------
-- Setup — a branch, a member, an active dues charge, an obligation of 25000.
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('bbbbbbbb-0000-0000-0000-00000000aaaa', 'e35a@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES (
  'bbbbbbbb-1111-0000-0000-000000000001',
  'E3.5 Test Branch',
  'e35-test-branch',
  'branch',
  '00000000-0000-0000-0000-000000000001',
  'XAF'
);

INSERT INTO core.members (id, full_name, email, batch_scope_id, house_scope_id, network_scope_id)
VALUES
  ('bbbbbbbb-4444-0000-0000-000000000001', 'E3.5 Member', 'e35m@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
   '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001');

INSERT INTO finance.charges
  (id, scope_id, shape, name, base_amount, currency, recurrence, activation_date, status)
VALUES
  ('bbbbbbbb-cccc-0000-0000-000000000001', 'bbbbbbbb-1111-0000-0000-000000000001',
   'charge', 'E3.5 Dues', 25000, 'XAF', 'monthly', '2027-01-01T00:00:00Z', 'active');

INSERT INTO finance.obligations
  (id, charge_id, scope_id, party_type, party_id, amount, currency, status, period_start)
VALUES
  ('bbbbbbbb-bbbb-0000-0000-000000000001', 'bbbbbbbb-cccc-0000-0000-000000000001',
   'bbbbbbbb-1111-0000-0000-000000000001', 'member', 'bbbbbbbb-4444-0000-0000-000000000001',
   25000, 'XAF', 'open', '2027-01-01');

-------------------------------------------------------------------------------
-- A) Baseline — obligation starts open with no payments
-------------------------------------------------------------------------------

SELECT is(
  (SELECT status::text FROM finance.obligations WHERE id = 'bbbbbbbb-bbbb-0000-0000-000000000001'),
  'open',
  'obligation starts as open with no payments'
);

-------------------------------------------------------------------------------
-- B) Partial payment → status becomes 'partial'
-------------------------------------------------------------------------------

INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by)
VALUES (
  'bbbbbbbb-aaaa-0000-0000-000000000001',
  'bbbbbbbb-bbbb-0000-0000-000000000001',
  'bbbbbbbb-cccc-0000-0000-000000000001',
  'bbbbbbbb-1111-0000-0000-000000000001',
  'bbbbbbbb-4444-0000-0000-000000000001',
  10000, 'XAF', 'cash', 'manual',
  'bbbbbbbb-0000-0000-0000-00000000aaaa'
);

SELECT is(
  (SELECT status::text FROM finance.obligations WHERE id = 'bbbbbbbb-bbbb-0000-0000-000000000001'),
  'partial',
  'obligation transitions to partial after 10000 of 25000 paid'
);

-------------------------------------------------------------------------------
-- C) Top-up to full → status becomes 'paid'
-------------------------------------------------------------------------------

INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by)
VALUES (
  'bbbbbbbb-aaaa-0000-0000-000000000002',
  'bbbbbbbb-bbbb-0000-0000-000000000001',
  'bbbbbbbb-cccc-0000-0000-000000000001',
  'bbbbbbbb-1111-0000-0000-000000000001',
  'bbbbbbbb-4444-0000-0000-000000000001',
  15000, 'XAF', 'mtn_momo', 'auto',
  'bbbbbbbb-0000-0000-0000-00000000aaaa'
);

SELECT is(
  (SELECT status::text FROM finance.obligations WHERE id = 'bbbbbbbb-bbbb-0000-0000-000000000001'),
  'paid',
  'obligation transitions to paid after top-up (sum >= amount)'
);

-------------------------------------------------------------------------------
-- D) Reversing the top-up → status back to 'partial'
-------------------------------------------------------------------------------

INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by,
   reverses_payment_id, reversal_reason)
VALUES (
  'bbbbbbbb-aaaa-0000-0000-000000000003',
  'bbbbbbbb-bbbb-0000-0000-000000000001',
  'bbbbbbbb-cccc-0000-0000-000000000001',
  'bbbbbbbb-1111-0000-0000-000000000001',
  'bbbbbbbb-4444-0000-0000-000000000001',
  15000, 'XAF', 'mtn_momo', 'manual',
  'bbbbbbbb-0000-0000-0000-00000000aaaa',
  'bbbbbbbb-aaaa-0000-0000-000000000002',
  'Provider double-charged the payer'
);

SELECT is(
  (SELECT status::text FROM finance.obligations WHERE id = 'bbbbbbbb-bbbb-0000-0000-000000000001'),
  'partial',
  'obligation returns to partial after the top-up is reversed'
);

-------------------------------------------------------------------------------
-- E) Reversing the original 10000 payment too → status back to 'open'
-------------------------------------------------------------------------------

INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by,
   reverses_payment_id, reversal_reason)
VALUES (
  'bbbbbbbb-aaaa-0000-0000-000000000004',
  'bbbbbbbb-bbbb-0000-0000-000000000001',
  'bbbbbbbb-cccc-0000-0000-000000000001',
  'bbbbbbbb-1111-0000-0000-000000000001',
  'bbbbbbbb-4444-0000-0000-000000000001',
  10000, 'XAF', 'cash', 'manual',
  'bbbbbbbb-0000-0000-0000-00000000aaaa',
  'bbbbbbbb-aaaa-0000-0000-000000000001',
  'Duplicate manual entry'
);

SELECT is(
  (SELECT status::text FROM finance.obligations WHERE id = 'bbbbbbbb-bbbb-0000-0000-000000000001'),
  'open',
  'obligation returns to open after both payments are reversed (sum <= 0)'
);

-------------------------------------------------------------------------------
-- F) M1 append-only still fires — payments UPDATE raises 42501
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ UPDATE finance.payments
        SET amount = 1
      WHERE id = 'bbbbbbbb-aaaa-0000-0000-000000000001' $$,
  '42501',
  NULL,
  'M4 code path still respects the M1 payments-append-only trigger'
);

-------------------------------------------------------------------------------
-- G) CHECK payments_reversal_has_reason: reverses_payment_id needs a reason
-------------------------------------------------------------------------------
-- Try to insert a reversal WITHOUT a reason.

SELECT throws_ok(
  $$ INSERT INTO finance.payments
       (obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by, reverses_payment_id)
     VALUES
       ('bbbbbbbb-bbbb-0000-0000-000000000001',
        'bbbbbbbb-cccc-0000-0000-000000000001',
        'bbbbbbbb-1111-0000-0000-000000000001',
        'bbbbbbbb-4444-0000-0000-000000000001',
        5000, 'XAF', 'cash', 'manual',
        'bbbbbbbb-0000-0000-0000-00000000aaaa',
        'bbbbbbbb-aaaa-0000-0000-000000000001') $$,
  '23514',
  NULL,
  'payments CHECK: reverses_payment_id without reversal_reason raises 23514'
);

-------------------------------------------------------------------------------
-- H) Terminal 'cancelled' preserved despite a late payment landing
-------------------------------------------------------------------------------
-- Cancel the obligation, then INSERT a payment and confirm status stays
-- cancelled.

UPDATE finance.obligations SET status = 'cancelled'
 WHERE id = 'bbbbbbbb-bbbb-0000-0000-000000000001';

INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by)
VALUES (
  'bbbbbbbb-aaaa-0000-0000-000000000005',
  'bbbbbbbb-bbbb-0000-0000-000000000001',
  'bbbbbbbb-cccc-0000-0000-000000000001',
  'bbbbbbbb-1111-0000-0000-000000000001',
  'bbbbbbbb-4444-0000-0000-000000000001',
  25000, 'XAF', 'cash', 'manual',
  'bbbbbbbb-0000-0000-0000-00000000aaaa'
);

SELECT is(
  (SELECT status::text FROM finance.obligations WHERE id = 'bbbbbbbb-bbbb-0000-0000-000000000001'),
  'cancelled',
  'cancelled status is preserved — the recompute trigger short-circuits on terminals'
);

-------------------------------------------------------------------------------
-- I) Terminal 'forgiven' preserved (same principle)
-------------------------------------------------------------------------------

UPDATE finance.obligations SET status = 'forgiven'
 WHERE id = 'bbbbbbbb-bbbb-0000-0000-000000000001';

INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by)
VALUES (
  'bbbbbbbb-aaaa-0000-0000-000000000006',
  'bbbbbbbb-bbbb-0000-0000-000000000001',
  'bbbbbbbb-cccc-0000-0000-000000000001',
  'bbbbbbbb-1111-0000-0000-000000000001',
  'bbbbbbbb-4444-0000-0000-000000000001',
  1000, 'XAF', 'cash', 'manual',
  'bbbbbbbb-0000-0000-0000-00000000aaaa'
);

SELECT is(
  (SELECT status::text FROM finance.obligations WHERE id = 'bbbbbbbb-bbbb-0000-0000-000000000001'),
  'forgiven',
  'forgiven status is preserved — the recompute trigger short-circuits on terminals'
);

-------------------------------------------------------------------------------
-- J) Contribution payments (no obligation_id) — trigger no-ops silently
-------------------------------------------------------------------------------
-- A goal-shape payment carries no obligation_id. The trigger returns
-- immediately for these rows. Just confirm the INSERT succeeds and
-- doesn't blow up.

INSERT INTO finance.charges
  (id, scope_id, shape, name, currency, goal_amount, lifecycle, open_date, close_date, status)
VALUES
  ('bbbbbbbb-cccc-0000-0000-000000000002', 'bbbbbbbb-1111-0000-0000-000000000001',
   'goal', 'E3.5 Goal', 'XAF', 100000, 'open',
   '2027-01-01T00:00:00Z', '2027-03-01T00:00:00Z', 'active');

SELECT lives_ok(
  $$ INSERT INTO finance.payments
       (charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by)
     VALUES
       ('bbbbbbbb-cccc-0000-0000-000000000002',
        'bbbbbbbb-1111-0000-0000-000000000001',
        'bbbbbbbb-4444-0000-0000-000000000001',
        20000, 'XAF', 'mtn_momo', 'manual',
        'bbbbbbbb-0000-0000-0000-00000000aaaa') $$,
  'contribution payment without obligation_id inserts cleanly; recompute trigger silently no-ops'
);

SELECT * FROM finish();
ROLLBACK;
