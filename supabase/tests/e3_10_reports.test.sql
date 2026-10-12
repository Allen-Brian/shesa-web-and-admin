-- pgTAP: Phase 3 M9 finance reports.
--
-- Exercises each of the six report functions:
--   get_collections
--   get_arrears
--   get_contribution_progress
--   get_payment_method_breakdown
--   get_expense_report_by_category
--   get_member_statement
--
-- Each is auth-gated on finance.report / treasury.read at scope.
-- Tests confirm both the numbers AND the auth denial.

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(10);

-------------------------------------------------------------------------------
-- Setup
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('a1a1a1a1-0000-0000-0000-00000000aaaa', 'e310a@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('a1a1a1a1-0000-0000-0000-00000000bbbb', 'e310b@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES (
  'a1a1a1a1-1111-0000-0000-000000000001',
  'E3.10 Test Branch',
  'e310-test-branch',
  'branch',
  '00000000-0000-0000-0000-000000000001',
  'XAF'
);

INSERT INTO core.members (id, full_name, email, batch_scope_id, house_scope_id, network_scope_id)
VALUES
  ('a1a1a1a1-4444-0000-0000-000000000001', 'Alice Test', 'alice-e310@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
   '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001'),
  ('a1a1a1a1-4444-0000-0000-000000000002', 'Bob Test', 'bob-e310@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
   '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001');

-- Two charges: dues + goal contribution.
INSERT INTO finance.charges
  (id, scope_id, shape, name, base_amount, currency, recurrence, activation_date, status)
VALUES
  ('a1a1a1a1-cccc-0000-0000-000000000001', 'a1a1a1a1-1111-0000-0000-000000000001',
   'charge', 'January Dues', 20000, 'XAF', 'monthly', '2027-01-01T00:00:00Z', 'active');

INSERT INTO finance.charges
  (id, scope_id, shape, name, currency, goal_amount, lifecycle, open_date, close_date, status)
VALUES
  ('a1a1a1a1-cccc-0000-0000-000000000002', 'a1a1a1a1-1111-0000-0000-000000000001',
   'goal', 'AGM Project Fund', 'XAF', 500000, 'open',
   '2027-01-01T00:00:00Z', '2027-06-30T00:00:00Z', 'active');

-- Obligations for Alice and Bob against the dues charge.
INSERT INTO finance.obligations
  (id, charge_id, scope_id, party_type, party_id, amount, currency, status, period_start)
VALUES
  ('a1a1a1a1-bbbb-0000-0000-000000000001', 'a1a1a1a1-cccc-0000-0000-000000000001',
   'a1a1a1a1-1111-0000-0000-000000000001', 'member', 'a1a1a1a1-4444-0000-0000-000000000001',
   20000, 'XAF', 'open', '2027-01-01'),
  ('a1a1a1a1-bbbb-0000-0000-000000000002', 'a1a1a1a1-cccc-0000-0000-000000000001',
   'a1a1a1a1-1111-0000-0000-000000000001', 'member', 'a1a1a1a1-4444-0000-0000-000000000002',
   20000, 'XAF', 'open', '2027-01-01');

-- Alice pays her dues in full (mtn_momo).
INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by)
VALUES (
  'a1a1a1a1-aaaa-0000-0000-000000000001',
  'a1a1a1a1-bbbb-0000-0000-000000000001',
  'a1a1a1a1-cccc-0000-0000-000000000001',
  'a1a1a1a1-1111-0000-0000-000000000001',
  'a1a1a1a1-4444-0000-0000-000000000001',
  20000, 'XAF', 'mtn_momo', 'auto',
  'a1a1a1a1-0000-0000-0000-00000000aaaa'
);

-- Bob pays half (cash).
INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by)
VALUES (
  'a1a1a1a1-aaaa-0000-0000-000000000002',
  'a1a1a1a1-bbbb-0000-0000-000000000002',
  'a1a1a1a1-cccc-0000-0000-000000000001',
  'a1a1a1a1-1111-0000-0000-000000000001',
  'a1a1a1a1-4444-0000-0000-000000000002',
  10000, 'XAF', 'cash', 'manual',
  'a1a1a1a1-0000-0000-0000-00000000aaaa'
);

-- Alice donates to the AGM goal (25000).
INSERT INTO finance.payments
  (id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by)
VALUES (
  'a1a1a1a1-aaaa-0000-0000-000000000003',
  'a1a1a1a1-cccc-0000-0000-000000000002',
  'a1a1a1a1-1111-0000-0000-000000000001',
  'a1a1a1a1-4444-0000-0000-000000000001',
  25000, 'XAF', 'orange_money', 'auto',
  'a1a1a1a1-0000-0000-0000-00000000aaaa'
);

-- An expense: 15000 venue rental.
INSERT INTO finance.expenses
  (id, scope_id, category_id, payee, amount, currency, status, recorded_by)
VALUES (
  'a1a1a1a1-eeee-0000-0000-000000000001',
  'a1a1a1a1-1111-0000-0000-000000000001',
  (SELECT id FROM finance.expense_categories WHERE key = 'venue'),
  'Community Hall', 15000, 'XAF', 'recorded',
  'a1a1a1a1-0000-0000-0000-00000000aaaa'
);

-- Grant finance role to user A at scope so the reports pass auth.
INSERT INTO core.role_assignments (id, user_id, role_id, scope_id, starts_at)
SELECT
  'a1a1a1a1-2222-0000-0000-000000000001',
  'a1a1a1a1-0000-0000-0000-00000000aaaa',
  r.id,
  'a1a1a1a1-1111-0000-0000-000000000001',
  NOW()
FROM core.roles r WHERE r.key = 'finance';

-------------------------------------------------------------------------------
-- Impersonate user A
-------------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;
SET LOCAL request.jwt.claim.sub = 'a1a1a1a1-0000-0000-0000-00000000aaaa';
SET LOCAL request.jwt.claims = '{"sub":"a1a1a1a1-0000-0000-0000-00000000aaaa","role":"authenticated"}';

-------------------------------------------------------------------------------
-- A) get_collections rolls up 20000 (Alice dues) + 10000 (Bob dues) + 25000 (Alice goal)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT SUM(total_collected)::numeric FROM finance.get_collections(
    'a1a1a1a1-1111-0000-0000-000000000001'::uuid, NULL, NOW())),
  55000.0000::numeric,
  'M9 get_collections: total across all charges (20k + 10k + 25k = 55k)'
);

-------------------------------------------------------------------------------
-- B) get_collections returns per-charge rows
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM finance.get_collections(
    'a1a1a1a1-1111-0000-0000-000000000001'::uuid, NULL, NOW())),
  2,
  'M9 get_collections: one row per charge (2 charges present)'
);

-------------------------------------------------------------------------------
-- C) get_arrears — Bob owes 10000, Alice fully paid
-------------------------------------------------------------------------------
-- Only Bob is in arrears (owed 20000, paid 10000). Alice's obligation
-- transitioned to 'paid' via the M4A trigger and drops out of the filter.

SELECT is(
  (SELECT COUNT(*)::int FROM finance.get_arrears('a1a1a1a1-1111-0000-0000-000000000001'::uuid)),
  1,
  'M9 get_arrears: exactly one member in arrears (Bob)'
);

SELECT is(
  (SELECT arrears FROM finance.get_arrears('a1a1a1a1-1111-0000-0000-000000000001'::uuid) LIMIT 1),
  10000.0000::numeric,
  'M9 get_arrears: Bob owes 10000 (20k - 10k paid)'
);

-------------------------------------------------------------------------------
-- D) get_contribution_progress for the goal
-------------------------------------------------------------------------------

SELECT is(
  (SELECT raised FROM finance.get_contribution_progress('a1a1a1a1-cccc-0000-0000-000000000002'::uuid)),
  25000.0000::numeric,
  'M9 get_contribution_progress: goal raised = 25000 so far'
);

SELECT is(
  (SELECT contributor_count::int FROM finance.get_contribution_progress('a1a1a1a1-cccc-0000-0000-000000000002'::uuid)),
  1,
  'M9 get_contribution_progress: one distinct contributor'
);

-------------------------------------------------------------------------------
-- E) get_payment_method_breakdown groups by method
-------------------------------------------------------------------------------
-- mtn_momo: 20000, cash: 10000, orange_money: 25000 → three rows.

SELECT is(
  (SELECT COUNT(*)::int FROM finance.get_payment_method_breakdown(
    'a1a1a1a1-1111-0000-0000-000000000001'::uuid, NULL, NOW())),
  3,
  'M9 get_payment_method_breakdown: three methods used'
);

-------------------------------------------------------------------------------
-- F) get_expense_report_by_category — one venue row of 15000
-------------------------------------------------------------------------------

SELECT is(
  (SELECT total_amount FROM finance.get_expense_report_by_category(
    'a1a1a1a1-1111-0000-0000-000000000001'::uuid, NULL, NOW())
    WHERE category_key = 'venue'),
  15000.0000::numeric,
  'M9 get_expense_report_by_category: venue category = 15000'
);

-------------------------------------------------------------------------------
-- G) get_member_statement for Alice — one row, balance 0
-------------------------------------------------------------------------------

SELECT is(
  (SELECT balance FROM finance.get_member_statement(
    'a1a1a1a1-4444-0000-0000-000000000001'::uuid, NULL, NOW()) LIMIT 1),
  0.0000::numeric,
  'M9 get_member_statement: Alice balance = 0 (fully paid dues)'
);

-------------------------------------------------------------------------------
-- H) Auth denial — user B has no permission at scope
-------------------------------------------------------------------------------

SET LOCAL request.jwt.claim.sub = 'a1a1a1a1-0000-0000-0000-00000000bbbb';
SET LOCAL request.jwt.claims = '{"sub":"a1a1a1a1-0000-0000-0000-00000000bbbb","role":"authenticated"}';

SELECT throws_ok(
  $$ SELECT * FROM finance.get_collections('a1a1a1a1-1111-0000-0000-000000000001'::uuid, NULL, NOW()) $$,
  '42501',
  NULL,
  'M9 get_collections denies caller without finance.report at scope'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
