-- pgTAP: Phase 3 M6 treasury + ledger invariants.
--
-- Exercises the end-to-end path from payment INSERT → ledger row →
-- treasury balance update, plus the get_treasury_statement report.
--
-- Tests:
--   A. Payment INSERT writes a matching income ledger row.
--   B. Payment INSERT increments treasury_balances.
--   C. Balance sum matches ledger sum for the scope.
--   D. Reversal payment writes an expense ledger row.
--   E. Reversal decrements treasury_balances back to 0.
--   F. get_treasury_statement returns opening / income / expense / closing.
--   G. get_treasury_statement denies caller without treasury.read (42501).
--   H. Treasury balance row auto-created on first payment (idempotent).
--   I. Ledger append-only still holds — UPDATE raises 42501.
--   J. Reversal chain preserves the running balance across
--      multiple payments (partial payment + full payment + reverse full).

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(10);

-------------------------------------------------------------------------------
-- Setup
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('dddddddd-0000-0000-0000-00000000aaaa', 'e37a@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('dddddddd-0000-0000-0000-00000000bbbb', 'e37b@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES (
  'dddddddd-1111-0000-0000-000000000001',
  'E3.7 Test Branch',
  'e37-test-branch',
  'branch',
  '00000000-0000-0000-0000-000000000001',
  'XAF'
);

INSERT INTO core.members (id, full_name, email, batch_scope_id, house_scope_id, network_scope_id)
VALUES
  ('dddddddd-4444-0000-0000-000000000001', 'E3.7 Member', 'e37m@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
   '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001');

INSERT INTO finance.charges
  (id, scope_id, shape, name, base_amount, currency, recurrence, activation_date, status)
VALUES
  ('dddddddd-cccc-0000-0000-000000000001', 'dddddddd-1111-0000-0000-000000000001',
   'charge', 'E3.7 Dues', 30000, 'XAF', 'monthly', '2027-01-01T00:00:00Z', 'active');

INSERT INTO finance.obligations
  (id, charge_id, scope_id, party_type, party_id, amount, currency, status, period_start)
VALUES
  ('dddddddd-bbbb-0000-0000-000000000001', 'dddddddd-cccc-0000-0000-000000000001',
   'dddddddd-1111-0000-0000-000000000001', 'member', 'dddddddd-4444-0000-0000-000000000001',
   30000, 'XAF', 'open', '2027-01-01');

-- User A gets finance role at the test branch for the RLS + get_statement paths.
INSERT INTO core.role_assignments (id, user_id, role_id, scope_id, starts_at)
SELECT
  'dddddddd-2222-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-00000000aaaa',
  r.id,
  'dddddddd-1111-0000-0000-000000000001',
  NOW()
FROM core.roles r WHERE r.key = 'finance';

-------------------------------------------------------------------------------
-- H) Insert first payment — balance row auto-created; A + B + C fall out
-------------------------------------------------------------------------------

INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by)
VALUES (
  'dddddddd-aaaa-0000-0000-000000000001',
  'dddddddd-bbbb-0000-0000-000000000001',
  'dddddddd-cccc-0000-0000-000000000001',
  'dddddddd-1111-0000-0000-000000000001',
  'dddddddd-4444-0000-0000-000000000001',
  10000, 'XAF', 'cash', 'manual',
  'dddddddd-0000-0000-0000-00000000aaaa'
);

-- A) Ledger row exists with direction='income', amount matches
SELECT is(
  (SELECT COUNT(*)::int FROM finance.ledger_entries
    WHERE payment_id = 'dddddddd-aaaa-0000-0000-000000000001'
      AND direction = 'income'
      AND amount = 10000),
  1,
  'M6: payment INSERT writes exactly one income ledger row with matching amount'
);

-- B) Treasury balance auto-created and set to 10000
SELECT is(
  (SELECT balance::text FROM finance.treasury_balances
    WHERE scope_id = 'dddddddd-1111-0000-0000-000000000001'),
  '10000.0000',
  'M6: treasury_balances row auto-created; balance = payment amount'
);

-- C) Balance sum matches ledger sum
SELECT is(
  (SELECT balance FROM finance.treasury_balances
    WHERE scope_id = 'dddddddd-1111-0000-0000-000000000001'),
  (SELECT COALESCE(SUM(CASE direction WHEN 'income' THEN amount ELSE -amount END), 0)
     FROM finance.ledger_entries
    WHERE scope_id = 'dddddddd-1111-0000-0000-000000000001'),
  'M6: treasury balance matches ledger sum invariant'
);

-------------------------------------------------------------------------------
-- Add a second payment (full top-up) and a reversal of the top-up
-------------------------------------------------------------------------------

INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by)
VALUES (
  'dddddddd-aaaa-0000-0000-000000000002',
  'dddddddd-bbbb-0000-0000-000000000001',
  'dddddddd-cccc-0000-0000-000000000001',
  'dddddddd-1111-0000-0000-000000000001',
  'dddddddd-4444-0000-0000-000000000001',
  20000, 'XAF', 'mtn_momo', 'auto',
  'dddddddd-0000-0000-0000-00000000aaaa'
);

-- Balance should be 30000 now (10000 + 20000).
SELECT is(
  (SELECT balance::text FROM finance.treasury_balances
    WHERE scope_id = 'dddddddd-1111-0000-0000-000000000001'),
  '30000.0000',
  'M6: balance accumulates across payments (10000 + 20000 = 30000)'
);

-- D) Reversal — inserts a payment with reverses_payment_id
INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by,
   reverses_payment_id, reversal_reason)
VALUES (
  'dddddddd-aaaa-0000-0000-000000000003',
  'dddddddd-bbbb-0000-0000-000000000001',
  'dddddddd-cccc-0000-0000-000000000001',
  'dddddddd-1111-0000-0000-000000000001',
  'dddddddd-4444-0000-0000-000000000001',
  20000, 'XAF', 'mtn_momo', 'manual',
  'dddddddd-0000-0000-0000-00000000aaaa',
  'dddddddd-aaaa-0000-0000-000000000002',
  'Provider double-charged'
);

SELECT is(
  (SELECT COUNT(*)::int FROM finance.ledger_entries
    WHERE payment_id = 'dddddddd-aaaa-0000-0000-000000000003'
      AND direction = 'expense'
      AND amount = 20000),
  1,
  'M6: reversal payment writes an expense ledger row'
);

-- E) Balance decrements back to 10000.
SELECT is(
  (SELECT balance::text FROM finance.treasury_balances
    WHERE scope_id = 'dddddddd-1111-0000-0000-000000000001'),
  '10000.0000',
  'M6: reversal decrements the balance (30000 - 20000 = 10000)'
);

-------------------------------------------------------------------------------
-- F) get_treasury_statement returns the correct window rollup
-------------------------------------------------------------------------------
-- Impersonate the finance user (permission gate lives inside the fn).

SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;
SET LOCAL request.jwt.claim.sub = 'dddddddd-0000-0000-0000-00000000aaaa';
SET LOCAL request.jwt.claims = '{"sub":"dddddddd-0000-0000-0000-00000000aaaa","role":"authenticated"}';

SELECT is(
  (SELECT closing_balance FROM finance.get_treasury_statement(
    'dddddddd-1111-0000-0000-000000000001'::uuid,
    NULL, NOW())),
  10000.0000::numeric,
  'M6: get_treasury_statement closing_balance matches treasury_balances (10000)'
);

-------------------------------------------------------------------------------
-- G) get_treasury_statement denies caller without treasury.read
-------------------------------------------------------------------------------

SET LOCAL request.jwt.claim.sub = 'dddddddd-0000-0000-0000-00000000bbbb';
SET LOCAL request.jwt.claims = '{"sub":"dddddddd-0000-0000-0000-00000000bbbb","role":"authenticated"}';

SELECT throws_ok(
  $$ SELECT * FROM finance.get_treasury_statement(
       'dddddddd-1111-0000-0000-000000000001'::uuid,
       NULL, NOW()) $$,
  '42501',
  NULL,
  'M6: get_treasury_statement denies caller without treasury.read'
);

RESET ROLE;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

-------------------------------------------------------------------------------
-- I) Ledger append-only still fires under the M6 code path
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ UPDATE finance.ledger_entries SET amount = 1 WHERE payment_id = 'dddddddd-aaaa-0000-0000-000000000001' $$,
  '42501',
  NULL,
  'M6: ledger append-only trigger still blocks UPDATE (belt + suspenders holds)'
);

-------------------------------------------------------------------------------
-- J) Reversal chain preserves balance across a longer sequence
-------------------------------------------------------------------------------
-- Insert another payment (5000) + another reversal (5000). Balance
-- should end at 10000 (unchanged from the cycle).

INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by)
VALUES (
  'dddddddd-aaaa-0000-0000-000000000004',
  'dddddddd-bbbb-0000-0000-000000000001',
  'dddddddd-cccc-0000-0000-000000000001',
  'dddddddd-1111-0000-0000-000000000001',
  'dddddddd-4444-0000-0000-000000000001',
  5000, 'XAF', 'cash', 'manual',
  'dddddddd-0000-0000-0000-00000000aaaa'
);

INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by,
   reverses_payment_id, reversal_reason)
VALUES (
  'dddddddd-aaaa-0000-0000-000000000005',
  'dddddddd-bbbb-0000-0000-000000000001',
  'dddddddd-cccc-0000-0000-000000000001',
  'dddddddd-1111-0000-0000-000000000001',
  'dddddddd-4444-0000-0000-000000000001',
  5000, 'XAF', 'cash', 'manual',
  'dddddddd-0000-0000-0000-00000000aaaa',
  'dddddddd-aaaa-0000-0000-000000000004',
  'Duplicate cash entry'
);

SELECT is(
  (SELECT balance::text FROM finance.treasury_balances
    WHERE scope_id = 'dddddddd-1111-0000-0000-000000000001'),
  '10000.0000',
  'M6: balance restored after +5000/-5000 reversal chain (still 10000)'
);

SELECT * FROM finish();
ROLLBACK;
