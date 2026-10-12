-- pgTAP: Phase 3 M7 expense engine invariants.
--
-- Symmetrical to M6's payment path. Exercises:
--   * status='recorded' expense fires the ledger writer on INSERT.
--   * treasury balance decrements by the expense amount.
--   * status='pending_approval' expense does NOT fire the ledger writer.
--   * pending → approved transition fires the ledger writer (UPDATE trigger).
--   * Reversal expense writes a direction='income' ledger row and
--     restores the balance.
--   * M1 freeze (money columns) still holds under M7 code path.
--   * A pending_approval expense cannot be edited to change amount
--     (freeze blocks it), only approved.

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(10);

-------------------------------------------------------------------------------
-- Setup
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('eeeeeeee-0000-0000-0000-00000000aaaa', 'e38a@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES (
  'eeeeeeee-1111-0000-0000-000000000001',
  'E3.8 Test Branch',
  'e38-test-branch',
  'branch',
  '00000000-0000-0000-0000-000000000001',
  'XAF'
);

-- Prime the balance with an income payment so we have room to spend.
-- Add a member + charge + obligation + payment so the trigger chain fires.
INSERT INTO core.members (id, full_name, email, batch_scope_id, house_scope_id, network_scope_id)
VALUES
  ('eeeeeeee-4444-0000-0000-000000000001', 'E3.8 Member', 'e38m@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
   '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001');

INSERT INTO finance.charges
  (id, scope_id, shape, name, base_amount, currency, recurrence, activation_date, status)
VALUES
  ('eeeeeeee-cccc-0000-0000-000000000001', 'eeeeeeee-1111-0000-0000-000000000001',
   'charge', 'E3.8 Dues', 100000, 'XAF', 'monthly', '2027-01-01T00:00:00Z', 'active');

INSERT INTO finance.obligations
  (id, charge_id, scope_id, party_type, party_id, amount, currency, status, period_start)
VALUES
  ('eeeeeeee-bbbb-0000-0000-000000000001', 'eeeeeeee-cccc-0000-0000-000000000001',
   'eeeeeeee-1111-0000-0000-000000000001', 'member', 'eeeeeeee-4444-0000-0000-000000000001',
   100000, 'XAF', 'open', '2027-01-01');

INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by)
VALUES (
  'eeeeeeee-aaaa-0000-0000-000000000001',
  'eeeeeeee-bbbb-0000-0000-000000000001',
  'eeeeeeee-cccc-0000-0000-000000000001',
  'eeeeeeee-1111-0000-0000-000000000001',
  'eeeeeeee-4444-0000-0000-000000000001',
  100000, 'XAF', 'cash', 'manual',
  'eeeeeeee-0000-0000-0000-00000000aaaa'
);

-- Baseline: balance should be 100000 after the M6 trigger fires.
SELECT is(
  (SELECT balance::text FROM finance.treasury_balances
    WHERE scope_id = 'eeeeeeee-1111-0000-0000-000000000001'),
  '100000.0000',
  'M7 setup: prime balance = 100000 from initial payment'
);

-------------------------------------------------------------------------------
-- A) Recorded expense fires ledger writer + decrements balance
-------------------------------------------------------------------------------

INSERT INTO finance.expenses
  (id, scope_id, payee, amount, currency, status, recorded_by)
VALUES (
  'eeeeeeee-eeee-0000-0000-000000000001',
  'eeeeeeee-1111-0000-0000-000000000001',
  'Venue rental',
  30000, 'XAF', 'recorded',
  'eeeeeeee-0000-0000-0000-00000000aaaa'
);

SELECT is(
  (SELECT COUNT(*)::int FROM finance.ledger_entries
    WHERE expense_id = 'eeeeeeee-eeee-0000-0000-000000000001'
      AND direction = 'expense'
      AND amount = 30000),
  1,
  'M7: recorded expense writes one direction=expense ledger row'
);

SELECT is(
  (SELECT balance::text FROM finance.treasury_balances
    WHERE scope_id = 'eeeeeeee-1111-0000-0000-000000000001'),
  '70000.0000',
  'M7: recorded expense decrements balance (100000 - 30000 = 70000)'
);

-------------------------------------------------------------------------------
-- B) Pending_approval expense does NOT fire the ledger writer yet
-------------------------------------------------------------------------------

INSERT INTO finance.expense_settings
  (scope_id, approval_threshold_amount, approval_threshold_currency)
VALUES
  ('eeeeeeee-1111-0000-0000-000000000001', 20000, 'XAF');

INSERT INTO finance.expenses
  (id, scope_id, payee, amount, currency, status, recorded_by)
VALUES (
  'eeeeeeee-eeee-0000-0000-000000000002',
  'eeeeeeee-1111-0000-0000-000000000001',
  'Big-ticket honorarium',
  50000, 'XAF', 'pending_approval',
  'eeeeeeee-0000-0000-0000-00000000aaaa'
);

SELECT is(
  (SELECT COUNT(*)::int FROM finance.ledger_entries
    WHERE expense_id = 'eeeeeeee-eeee-0000-0000-000000000002'),
  0,
  'M7: pending_approval expense does NOT write a ledger row on INSERT'
);

SELECT is(
  (SELECT balance::text FROM finance.treasury_balances
    WHERE scope_id = 'eeeeeeee-1111-0000-0000-000000000001'),
  '70000.0000',
  'M7: pending_approval expense leaves balance unchanged'
);

-------------------------------------------------------------------------------
-- C) Approving transitions status + fires the UPDATE ledger writer
-------------------------------------------------------------------------------

UPDATE finance.expenses
   SET status = 'approved',
       approved_by = 'eeeeeeee-0000-0000-0000-00000000aaaa',
       approved_at = NOW()
 WHERE id = 'eeeeeeee-eeee-0000-0000-000000000002';

SELECT is(
  (SELECT COUNT(*)::int FROM finance.ledger_entries
    WHERE expense_id = 'eeeeeeee-eeee-0000-0000-000000000002'
      AND direction = 'expense'
      AND amount = 50000),
  1,
  'M7: approving pending_approval writes the deferred ledger row'
);

SELECT is(
  (SELECT balance::text FROM finance.treasury_balances
    WHERE scope_id = 'eeeeeeee-1111-0000-0000-000000000001'),
  '20000.0000',
  'M7: approving the pending expense decrements balance (70000 - 50000 = 20000)'
);

-------------------------------------------------------------------------------
-- D) Reversal expense writes an income row + restores balance
-------------------------------------------------------------------------------

INSERT INTO finance.expenses
  (id, scope_id, payee, amount, currency, status, recorded_by,
   reverses_expense_id, reversal_reason)
VALUES (
  'eeeeeeee-eeee-0000-0000-000000000003',
  'eeeeeeee-1111-0000-0000-000000000001',
  'Venue rental',
  30000, 'XAF', 'recorded',
  'eeeeeeee-0000-0000-0000-00000000aaaa',
  'eeeeeeee-eeee-0000-0000-000000000001',
  'Vendor refunded — event postponed'
);

SELECT is(
  (SELECT COUNT(*)::int FROM finance.ledger_entries
    WHERE expense_id = 'eeeeeeee-eeee-0000-0000-000000000003'
      AND direction = 'income'
      AND amount = 30000),
  1,
  'M7: reversal expense writes a direction=income ledger row'
);

SELECT is(
  (SELECT balance::text FROM finance.treasury_balances
    WHERE scope_id = 'eeeeeeee-1111-0000-0000-000000000001'),
  '50000.0000',
  'M7: reversal restores balance (20000 + 30000 = 50000)'
);

-------------------------------------------------------------------------------
-- E) M1 freeze still blocks — cannot edit amount even under M7 flows
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ UPDATE finance.expenses SET amount = 9999
      WHERE id = 'eeeeeeee-eeee-0000-0000-000000000001' $$,
  '42501',
  NULL,
  'M7: M1 expense freeze still blocks amount edits'
);

SELECT * FROM finish();
ROLLBACK;
