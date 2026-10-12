-- pgTAP: Phase 3 M1 finance foundation invariants.
--
-- Covers the immutability rules from spec Parts VI, VII, IX, X, XII —
-- the invariants that MUST hold from day one, before any charge /
-- payment / ledger logic ships. Every later Phase 3 milestone plugs into
-- these rails; if any of them slips, finance history becomes rewriteable
-- and every downstream statement loses its guarantee.
--
-- Tests:
--   A. finance.payments UPDATE raises 42501 (append-only)
--   B. finance.payments DELETE raises 42501
--   C. finance.ledger_entries UPDATE raises 42501
--   D. finance.ledger_entries DELETE raises 42501
--   E. finance.obligations UPDATE that changes amount raises 42501 (freeze)
--   F. finance.obligations UPDATE that only changes status succeeds
--   G. finance.obligations DELETE raises 42501
--   H. finance.expenses UPDATE that changes amount raises 42501 (freeze)
--   I. finance.expenses DELETE raises 42501
--   J. finance.expenses status transition pending_approval → approved works
--   K. Once expense is approved, further UPDATE raises 42501
--   L. Currency lock — updating scope currency raises when finance row exists
--   M. finance.treasury_balances direct UPDATE raises without the GUC
--   N. enums exist: charge_shape, obligation_status, payment_method
--   O. Sample permission keys exist (charge.create, obligation.forgive, treasury.read)

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(15);

-------------------------------------------------------------------------------
-- Setup — a test branch scope, a member, a charge, an obligation, a payment,
--         a ledger entry, and an expense.
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('77777777-0000-0000-0000-00000000aaaa', 'e31a@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES (
  '77777777-1111-0000-0000-000000000001',
  'E3.1 Test Branch',
  'e31-test-branch',
  'branch',
  '00000000-0000-0000-0000-000000000001',
  'XAF'
);

INSERT INTO core.members (
  id, full_name, email, batch_scope_id, house_scope_id, network_scope_id
) VALUES (
  '77777777-4444-0000-0000-000000000001',
  'E3.1 Test Member',
  'e31-member@shesa.test',
  (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
  '33333333-0000-0000-0000-000000000001',
  '44444444-0000-0000-0000-000000000001'
);

-- Charge (dues shape).
INSERT INTO finance.charges (
  id, scope_id, shape, name, base_amount, currency, recurrence, status
) VALUES (
  '77777777-cccc-0000-0000-000000000001',
  '77777777-1111-0000-0000-000000000001',
  'charge',
  'Test Monthly Dues',
  25000,
  'XAF',
  'monthly',
  'active'
);

-- Obligation for that charge on that member.
INSERT INTO finance.obligations (
  id, charge_id, scope_id, party_type, party_id, amount, currency, status, period_start
) VALUES (
  '77777777-bbbb-0000-0000-000000000001',
  '77777777-cccc-0000-0000-000000000001',
  '77777777-1111-0000-0000-000000000001',
  'member',
  '77777777-4444-0000-0000-000000000001',
  25000,
  'XAF',
  'open',
  '2027-01-01'
);

-- Payment settling that obligation.
INSERT INTO finance.payments (
  id, obligation_id, scope_id, payer_member_id,
  amount, currency, method, source, recorded_by
) VALUES (
  '77777777-aaaa-0000-0000-000000000001',
  '77777777-bbbb-0000-0000-000000000001',
  '77777777-1111-0000-0000-000000000001',
  '77777777-4444-0000-0000-000000000001',
  25000, 'XAF', 'mtn_momo', 'auto',
  '77777777-0000-0000-0000-00000000aaaa'
);

-- Ledger entry for that payment.
INSERT INTO finance.ledger_entries (
  id, journal_id, scope_id, direction, amount, currency, payment_id
) VALUES (
  '77777777-eeee-0000-0000-000000000001',
  '77777777-9999-0000-0000-000000000001',
  '77777777-1111-0000-0000-000000000001',
  'income',
  25000,
  'XAF',
  '77777777-aaaa-0000-0000-000000000001'
);

-- Expense in pending_approval status.
INSERT INTO finance.expenses (
  id, scope_id, payee, amount, currency, status, recorded_by
) VALUES (
  '77777777-dddd-0000-0000-000000000001',
  '77777777-1111-0000-0000-000000000001',
  'Test Venue Payee',
  50000,
  'XAF',
  'pending_approval',
  '77777777-0000-0000-0000-00000000aaaa'
);

-------------------------------------------------------------------------------
-- A) Payments UPDATE raises 42501
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ UPDATE finance.payments
        SET amount = 30000
      WHERE id = '77777777-aaaa-0000-0000-000000000001' $$,
  '42501',
  NULL,
  'finance.payments: UPDATE raises 42501 (append-only)'
);

-------------------------------------------------------------------------------
-- B) Payments DELETE raises 42501
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ DELETE FROM finance.payments
      WHERE id = '77777777-aaaa-0000-0000-000000000001' $$,
  '42501',
  NULL,
  'finance.payments: DELETE raises 42501 (append-only)'
);

-------------------------------------------------------------------------------
-- C) Ledger entries UPDATE raises 42501
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ UPDATE finance.ledger_entries
        SET amount = 30000
      WHERE id = '77777777-eeee-0000-0000-000000000001' $$,
  '42501',
  NULL,
  'finance.ledger_entries: UPDATE raises 42501 (append-only)'
);

-------------------------------------------------------------------------------
-- D) Ledger entries DELETE raises 42501
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ DELETE FROM finance.ledger_entries
      WHERE id = '77777777-eeee-0000-0000-000000000001' $$,
  '42501',
  NULL,
  'finance.ledger_entries: DELETE raises 42501 (append-only)'
);

-------------------------------------------------------------------------------
-- E) Obligation freeze — mutating amount raises 42501
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ UPDATE finance.obligations
        SET amount = 12000
      WHERE id = '77777777-bbbb-0000-0000-000000000001' $$,
  '42501',
  NULL,
  'finance.obligations: mutating frozen amount raises 42501'
);

-------------------------------------------------------------------------------
-- F) Obligation status transition succeeds (open → paid)
-------------------------------------------------------------------------------

SELECT lives_ok(
  $$ UPDATE finance.obligations
        SET status = 'paid'
      WHERE id = '77777777-bbbb-0000-0000-000000000001' $$,
  'finance.obligations: status transition open → paid succeeds (only frozen columns are locked)'
);

-------------------------------------------------------------------------------
-- G) Obligation DELETE raises 42501
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ DELETE FROM finance.obligations
      WHERE id = '77777777-bbbb-0000-0000-000000000001' $$,
  '42501',
  NULL,
  'finance.obligations: DELETE raises 42501 (transition to cancelled/forgiven instead)'
);

-------------------------------------------------------------------------------
-- H) Expenses freeze — mutating amount raises 42501
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ UPDATE finance.expenses
        SET amount = 12000
      WHERE id = '77777777-dddd-0000-0000-000000000001' $$,
  '42501',
  NULL,
  'finance.expenses: mutating frozen amount raises 42501'
);

-------------------------------------------------------------------------------
-- I) Expenses DELETE raises 42501
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ DELETE FROM finance.expenses
      WHERE id = '77777777-dddd-0000-0000-000000000001' $$,
  '42501',
  NULL,
  'finance.expenses: DELETE raises 42501 (reverse via reverses_expense_id instead)'
);

-------------------------------------------------------------------------------
-- J) Expenses status transition pending_approval → approved works
-------------------------------------------------------------------------------

SELECT lives_ok(
  $$ UPDATE finance.expenses
        SET status = 'approved',
            approved_by = '77777777-0000-0000-0000-00000000aaaa',
            approved_at = NOW()
      WHERE id = '77777777-dddd-0000-0000-000000000001' $$,
  'finance.expenses: pending_approval → approved transition succeeds'
);

-------------------------------------------------------------------------------
-- K) Once approved, further UPDATE raises 42501
-------------------------------------------------------------------------------
-- The freeze trigger tightens: after status='approved', no further edits
-- to status / approved_by / approved_at (or anything else). Corrections
-- are new reversing rows.

SELECT throws_ok(
  $$ UPDATE finance.expenses
        SET approved_at = NOW() + INTERVAL '1 day'
      WHERE id = '77777777-dddd-0000-0000-000000000001' $$,
  '42501',
  NULL,
  'finance.expenses: row is frozen once status=approved'
);

-------------------------------------------------------------------------------
-- L) Currency lock — updating scope currency raises when finance row exists
-------------------------------------------------------------------------------
-- The test branch has finance.charges + finance.payments + finance.obligations
-- + finance.expenses rows. Attempting to flip its currency_code should
-- raise 23514 from the shared enforce_currency_immutable_once_used trigger.

SELECT throws_ok(
  $$ UPDATE core.scopes
        SET currency_code = 'USD'
      WHERE id = '77777777-1111-0000-0000-000000000001' $$,
  '23514',
  NULL,
  'core.scopes: currency_code immutable once finance rows reference the scope'
);

-------------------------------------------------------------------------------
-- M) Treasury balances direct UPDATE raises without the GUC
-------------------------------------------------------------------------------
-- The ledger-writing path (M6) sets finance.writing_ledger=on inside its
-- SECURITY DEFINER writer. Without that GUC, direct UPDATEs raise 42501.
-- The balance row was auto-created by the M6 write_ledger_from_payment
-- trigger when the earlier payment INSERT fired — no explicit seed
-- needed here.

SELECT throws_ok(
  $$ UPDATE finance.treasury_balances
        SET balance = 999999
      WHERE scope_id = '77777777-1111-0000-0000-000000000001' $$,
  '42501',
  NULL,
  'finance.treasury_balances: direct UPDATE raises without finance.writing_ledger GUC'
);

-------------------------------------------------------------------------------
-- N) Sample enums exist with the expected values
-------------------------------------------------------------------------------

SELECT is(
  (SELECT array_agg(enumlabel::text ORDER BY enumsortorder)
   FROM pg_enum e
   INNER JOIN pg_type t ON t.oid = e.enumtypid
   INNER JOIN pg_namespace n ON n.oid = t.typnamespace
   WHERE t.typname = 'charge_shape' AND n.nspname = 'finance'),
  ARRAY['charge', 'goal', 'open', 'ticketed', 'fixed', 'donation']::text[],
  'finance.charge_shape enum has the six spec values in order'
);

-------------------------------------------------------------------------------
-- O) Sample new permission keys exist
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM core.permissions
    WHERE key IN (
      'charge.create',
      'contribution.approve',
      'payment.record',
      'obligation.forgive',
      'exception.create',
      'expense.record',
      'expense.approve',
      'treasury.read',
      'finance.report',
      'receipt.generate'
    )),
  10,
  'core.permissions: ten sample finance-grain keys are seeded'
);

SELECT * FROM finish();
ROLLBACK;
