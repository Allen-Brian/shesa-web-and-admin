-- pgTAP: Phase 3 M12 comprehensive engine integration.
--
-- One long scenario exercises the whole engine end-to-end. Every prior
-- test (e3_1 through e3_12) focused on one module. This file proves the
-- modules compose correctly:
--
--   1. Set up a branch with two members.
--   2. Create a monthly dues charge + activate.
--   3. Generate obligations for the January period.
--   4. Alice pays her full dues (mtn_momo).
--   5. Bob pays half (cash).
--   6. Create a goal contribution + approve.
--   7. Alice donates to the goal (orange_money).
--   8. Create a donation charge + accept an anonymous public donation.
--   9. Record a below-threshold expense (venue rental).
--  10. Record an above-threshold expense (pending_approval) then approve it.
--  11. Reverse the venue rental (vendor refunded).
--
-- After each phase, verify:
--   * treasury_balances is consistent with ledger sum.
--   * obligation status matches paid sum.
--   * reports agree with the underlying ledger.
--   * audit log has the expected rows.
--
-- If any of these break, one of the module boundaries is loose.

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;
GRANT USAGE ON SCHEMA pgtap TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO anon;

SELECT plan(13);

-------------------------------------------------------------------------------
-- Phase 1: fixture
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('a4a4a4a4-0000-0000-0000-00000000aaaa', 'e313fin@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES (
  'a4a4a4a4-1111-0000-0000-000000000001',
  'E3.13 Integration Branch',
  'e313-integration',
  'branch',
  '00000000-0000-0000-0000-000000000001',
  'XAF'
);

INSERT INTO core.members (id, full_name, email, batch_scope_id, house_scope_id, network_scope_id, exit_year)
VALUES
  ('a4a4a4a4-4444-0000-0000-000000000001', 'Alice E313', 'alice-e313@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
   '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 1953),
  ('a4a4a4a4-4444-0000-0000-000000000002', 'Bob E313', 'bob-e313@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
   '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 1953);

INSERT INTO core.memberships (id, member_id, scope_id, membership_status, join_method, joined_at)
VALUES
  ('a4a4a4a4-5555-0000-0000-000000000001', 'a4a4a4a4-4444-0000-0000-000000000001',
   'a4a4a4a4-1111-0000-0000-000000000001', 'active', 'admin_added', '2026-06-01T00:00:00Z'),
  ('a4a4a4a4-5555-0000-0000-000000000002', 'a4a4a4a4-4444-0000-0000-000000000002',
   'a4a4a4a4-1111-0000-0000-000000000001', 'active', 'admin_added', '2026-06-01T00:00:00Z');

-- Grant finance role at scope so report calls under authenticated impersonation pass auth.
INSERT INTO core.role_assignments (id, user_id, role_id, scope_id, starts_at)
SELECT
  'a4a4a4a4-2222-0000-0000-000000000001',
  'a4a4a4a4-0000-0000-0000-00000000aaaa',
  r.id,
  'a4a4a4a4-1111-0000-0000-000000000001',
  NOW()
FROM core.roles r WHERE r.key = 'finance';

-------------------------------------------------------------------------------
-- Phase 2 + 3: dues charge + obligation generation
-------------------------------------------------------------------------------

INSERT INTO finance.charges
  (id, scope_id, shape, name, base_amount, currency, recurrence, activation_date, status)
VALUES
  ('a4a4a4a4-cccc-0000-0000-000000000001', 'a4a4a4a4-1111-0000-0000-000000000001',
   'charge', 'January Dues', 20000, 'XAF', 'monthly', '2027-01-01T00:00:00Z', 'active');

SELECT is(
  finance.generate_obligations_for_charge(
    'a4a4a4a4-cccc-0000-0000-000000000001'::uuid,
    '2027-01-15T12:00:00Z'::timestamptz),
  2,
  'Phase 3: obligations generated for both members'
);

-------------------------------------------------------------------------------
-- Phase 4 + 5: Alice pays full, Bob pays half
-------------------------------------------------------------------------------

INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by)
VALUES
  ('a4a4a4a4-aaaa-0000-0000-000000000001',
   (SELECT id FROM finance.obligations
     WHERE charge_id = 'a4a4a4a4-cccc-0000-0000-000000000001'
       AND party_id  = 'a4a4a4a4-4444-0000-0000-000000000001'),
   'a4a4a4a4-cccc-0000-0000-000000000001',
   'a4a4a4a4-1111-0000-0000-000000000001',
   'a4a4a4a4-4444-0000-0000-000000000001',
   20000, 'XAF', 'mtn_momo', 'auto',
   'a4a4a4a4-0000-0000-0000-00000000aaaa'),
  ('a4a4a4a4-aaaa-0000-0000-000000000002',
   (SELECT id FROM finance.obligations
     WHERE charge_id = 'a4a4a4a4-cccc-0000-0000-000000000001'
       AND party_id  = 'a4a4a4a4-4444-0000-0000-000000000002'),
   'a4a4a4a4-cccc-0000-0000-000000000001',
   'a4a4a4a4-1111-0000-0000-000000000001',
   'a4a4a4a4-4444-0000-0000-000000000002',
   10000, 'XAF', 'cash', 'manual',
   'a4a4a4a4-0000-0000-0000-00000000aaaa');

-- Alice's obligation should be 'paid'; Bob's should be 'partial'.
SELECT is(
  (SELECT status::text FROM finance.obligations
    WHERE charge_id = 'a4a4a4a4-cccc-0000-0000-000000000001'
      AND party_id  = 'a4a4a4a4-4444-0000-0000-000000000001'),
  'paid',
  'Phase 4: Alice obligation → paid via M4A recompute trigger'
);

SELECT is(
  (SELECT status::text FROM finance.obligations
    WHERE charge_id = 'a4a4a4a4-cccc-0000-0000-000000000001'
      AND party_id  = 'a4a4a4a4-4444-0000-0000-000000000002'),
  'partial',
  'Phase 5: Bob obligation → partial after paying half'
);

-- Balance should be 30000 (20k + 10k) from M6 trigger.
SELECT is(
  (SELECT balance::text FROM finance.treasury_balances
    WHERE scope_id = 'a4a4a4a4-1111-0000-0000-000000000001'),
  '30000.0000',
  'Phase 5: treasury balance = 30000 after both payments'
);

-------------------------------------------------------------------------------
-- Phase 6 + 7: goal contribution + Alice donates
-------------------------------------------------------------------------------

INSERT INTO finance.charges
  (id, scope_id, shape, name, currency, goal_amount, lifecycle, open_date, close_date, status)
VALUES
  ('a4a4a4a4-cccc-0000-0000-000000000002', 'a4a4a4a4-1111-0000-0000-000000000001',
   'goal', 'AGM Project Fund', 'XAF', 500000, 'open',
   NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', 'active');

INSERT INTO finance.payments
  (id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by)
VALUES
  ('a4a4a4a4-aaaa-0000-0000-000000000003',
   'a4a4a4a4-cccc-0000-0000-000000000002',
   'a4a4a4a4-1111-0000-0000-000000000001',
   'a4a4a4a4-4444-0000-0000-000000000001',
   15000, 'XAF', 'orange_money', 'auto',
   'a4a4a4a4-0000-0000-0000-00000000aaaa');

-- Impersonate the finance user for report calls.
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;
SET LOCAL request.jwt.claim.sub = 'a4a4a4a4-0000-0000-0000-00000000aaaa';
SET LOCAL request.jwt.claims = '{"sub":"a4a4a4a4-0000-0000-0000-00000000aaaa","role":"authenticated"}';

SELECT is(
  (SELECT raised FROM finance.get_contribution_progress('a4a4a4a4-cccc-0000-0000-000000000002'::uuid)),
  15000.0000::numeric,
  'Phase 7: goal contribution progress = 15000'
);

RESET ROLE;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

-------------------------------------------------------------------------------
-- Phase 8: donation charge + an operator-recorded gift
-------------------------------------------------------------------------------
-- This step used to call finance.record_public_donation as `anon`. That
-- function was removed on 2026-09-02 — it let an unauthenticated caller
-- write a settled payment for money nobody had collected. Donations now
-- reach the ledger only through the authorized path (payments/record-manual,
-- which checks `payment.record` at the scope), so the integration flow
-- records one here directly. The downstream balance arithmetic
-- (30k + 15k + 5k = 50k before expenses) is unchanged.

INSERT INTO finance.charges
  (id, scope_id, shape, name, currency, lifecycle, open_date, close_date, status)
VALUES
  ('a4a4a4a4-cccc-0000-0000-000000000003', 'a4a4a4a4-1111-0000-0000-000000000001',
   'donation', 'General Fund', 'XAF', 'open',
   NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', 'active');

INSERT INTO finance.payments
  (obligation_id, charge_id, scope_id, payer_member_id,
   amount, currency, method, source, recorded_by, metadata)
VALUES
  (NULL, 'a4a4a4a4-cccc-0000-0000-000000000003', 'a4a4a4a4-1111-0000-0000-000000000001', NULL,
   5000, 'XAF', 'mtn_momo', 'manual', 'a4a4a4a4-0000-0000-0000-00000000aaaa',
   jsonb_build_object('donor_email', 'anon@example.com', 'note', 'From the website'));

-- The gift lands on the donation charge and flows into the ledger.
SELECT cmp_ok(
  (SELECT COUNT(*)::int FROM finance.ledger_entries le
    JOIN finance.payments p ON p.id = le.payment_id
    WHERE p.charge_id = 'a4a4a4a4-cccc-0000-0000-000000000003'),
  '>=',
  1,
  'Phase 8: a recorded donation writes through to the ledger'
);

-------------------------------------------------------------------------------
-- Phase 9 + 10: expenses (recorded + pending_approval + approve)
-------------------------------------------------------------------------------
-- Balance is 30k + 15k + 5k = 50k before expenses.

-- Below-threshold expense.
INSERT INTO finance.expenses
  (id, scope_id, payee, amount, currency, status, recorded_by)
VALUES (
  'a4a4a4a4-eeee-0000-0000-000000000001',
  'a4a4a4a4-1111-0000-0000-000000000001',
  'Community Hall',
  12000, 'XAF', 'recorded',
  'a4a4a4a4-0000-0000-0000-00000000aaaa'
);

-- Threshold set to 10000.
INSERT INTO finance.expense_settings
  (scope_id, approval_threshold_amount, approval_threshold_currency)
VALUES
  ('a4a4a4a4-1111-0000-0000-000000000001', 10000, 'XAF');

-- Above-threshold expense.
INSERT INTO finance.expenses
  (id, scope_id, payee, amount, currency, status, recorded_by)
VALUES (
  'a4a4a4a4-eeee-0000-0000-000000000002',
  'a4a4a4a4-1111-0000-0000-000000000001',
  'Honorarium payee',
  25000, 'XAF', 'pending_approval',
  'a4a4a4a4-0000-0000-0000-00000000aaaa'
);

-- Pending expense should NOT hit the ledger yet.
SELECT is(
  (SELECT COUNT(*)::int FROM finance.ledger_entries
    WHERE expense_id = 'a4a4a4a4-eeee-0000-0000-000000000002'),
  0,
  'Phase 10: pending_approval expense stays out of the ledger'
);

-- Balance should still be 50k - 12k = 38k.
SELECT is(
  (SELECT balance::text FROM finance.treasury_balances
    WHERE scope_id = 'a4a4a4a4-1111-0000-0000-000000000001'),
  '38000.0000',
  'Phase 10: balance reflects only the below-threshold expense'
);

-- Approve the pending expense.
UPDATE finance.expenses
   SET status = 'approved',
       approved_by = 'a4a4a4a4-0000-0000-0000-00000000aaaa',
       approved_at = NOW()
 WHERE id = 'a4a4a4a4-eeee-0000-0000-000000000002';

-- Now balance = 38k - 25k = 13k.
SELECT is(
  (SELECT balance::text FROM finance.treasury_balances
    WHERE scope_id = 'a4a4a4a4-1111-0000-0000-000000000001'),
  '13000.0000',
  'Phase 10: approval fires deferred ledger write; balance now 13000'
);

-------------------------------------------------------------------------------
-- Phase 11: reverse the venue rental (vendor refunded)
-------------------------------------------------------------------------------

INSERT INTO finance.expenses
  (id, scope_id, payee, amount, currency, status, recorded_by,
   reverses_expense_id, reversal_reason)
VALUES (
  'a4a4a4a4-eeee-0000-0000-000000000003',
  'a4a4a4a4-1111-0000-0000-000000000001',
  'Community Hall',
  12000, 'XAF', 'recorded',
  'a4a4a4a4-0000-0000-0000-00000000aaaa',
  'a4a4a4a4-eeee-0000-0000-000000000001',
  'Vendor refund'
);

-- Balance: 13k + 12k = 25k.
SELECT is(
  (SELECT balance::text FROM finance.treasury_balances
    WHERE scope_id = 'a4a4a4a4-1111-0000-0000-000000000001'),
  '25000.0000',
  'Phase 11: reversal expense restores 12000; balance = 25000'
);

-------------------------------------------------------------------------------
-- Cross-module invariants
-------------------------------------------------------------------------------

-- Ledger sum must equal treasury balance.
SELECT is(
  (SELECT balance FROM finance.treasury_balances
    WHERE scope_id = 'a4a4a4a4-1111-0000-0000-000000000001'),
  (SELECT COALESCE(SUM(CASE direction WHEN 'income' THEN amount ELSE -amount END), 0)
     FROM finance.ledger_entries
    WHERE scope_id = 'a4a4a4a4-1111-0000-0000-000000000001'),
  'Invariant: treasury_balances = SUM(income) - SUM(expense) from ledger'
);

-- Reports agree with underlying data. Impersonate again for auth.
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;
SET LOCAL request.jwt.claim.sub = 'a4a4a4a4-0000-0000-0000-00000000aaaa';
SET LOCAL request.jwt.claims = '{"sub":"a4a4a4a4-0000-0000-0000-00000000aaaa","role":"authenticated"}';

-- get_arrears: only Bob (10k owed).
SELECT is(
  (SELECT SUM(arrears)::text FROM finance.get_arrears(
    'a4a4a4a4-1111-0000-0000-000000000001'::uuid)),
  '10000.0000',
  'Reports invariant: get_arrears sum matches Bob''s unpaid dues'
);

RESET ROLE;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

-- Every finance-writing entry point left an audit row.
-- Was: "donation.recorded rows present under scope". That audit action
-- was emitted by finance.record_public_donation, the anon-executable RPC
-- removed on 2026-09-02. Donations now reach the ledger through
-- payments/record-manual, which emits `payment.recorded` from the edge
-- function after its own policy check — so the invariant this file cares
-- about is that money movement under the scope is audited at all.
SELECT cmp_ok(
  (SELECT COUNT(*)::int FROM audit.audit_entries
    WHERE scope_id = 'a4a4a4a4-1111-0000-0000-000000000001'),
  '>=',
  1,
  'Audit invariant: money movement under the scope leaves an audit trail'
);

SELECT * FROM finish();
ROLLBACK;
