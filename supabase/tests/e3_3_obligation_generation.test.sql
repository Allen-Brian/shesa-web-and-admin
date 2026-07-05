-- pgTAP: Phase 3 M2B obligation-generation invariants.
--
-- Exercises finance.compute_period + finance.generate_obligations_for_charge
-- against real inserts. The domain-side vitest suite covers the pure
-- period + proration math; this file covers the SQL implementation's
-- behavior end-to-end.
--
-- Tests:
--   A. compute_period(monthly, 1, Feb 15 UTC) → Feb 1 – Mar 1
--   B. compute_period(quarterly, 1, Feb 15) → Jan 1 – Apr 1
--   C. compute_period(yearly, 1, mid-2027) → 2027 Jan 1 – 2028 Jan 1
--   D. compute_period rejects one_time
--   E. generate_obligations_for_charge inserts one obligation per
--      active/passive member at the scope
--   F. generate_obligations_for_charge is idempotent — second call adds 0
--   G. generate_obligations_for_charge prorates a mid-period joiner
--   H. generate_obligations_for_charge skips a draft charge
--   I. generate_obligations_for_charge skips a non-obligation shape (goal)
--   J. Obligation freeze from M1 still holds — cannot mutate amount post-generation
--   K. generate_obligations_for_charge skips branch-as-body targeting (M2B v1 defers)

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(12);

-------------------------------------------------------------------------------
-- Setup — a test branch, three members with different join dates, a
--         monthly dues charge with base_amount=31000 (chosen so a
--         15-day proration in a 31-day month = 15000).
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('99999999-0000-0000-0000-00000000aaaa', 'e33a@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES (
  '99999999-1111-0000-0000-000000000001',
  'E3.3 Test Branch',
  'e33-test-branch',
  'branch',
  '00000000-0000-0000-0000-000000000001',
  'XAF'
);

-- Three members.
INSERT INTO core.members (id, full_name, email, batch_scope_id, house_scope_id, network_scope_id)
VALUES
  ('99999999-4444-0000-0000-000000000001', 'Long-time Member', 'lm@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
   '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001'),
  ('99999999-4444-0000-0000-000000000002', 'Mid-period Joiner', 'mp@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
   '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001'),
  ('99999999-4444-0000-0000-000000000003', 'Late Joiner', 'late@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
   '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001');

-- Memberships. joined_at differs per member to exercise proration.
--   Long-time  : joined 2026-06-01 (well before Jan 2027 period)
--   Mid-period : joined 2027-01-17 (14 days into January → 15 days owed)
--   Late       : joined 2027-02-05 (after period.end for a January reference)
INSERT INTO core.memberships (id, member_id, scope_id, membership_status, join_method, joined_at)
VALUES
  ('99999999-5555-0000-0000-000000000001', '99999999-4444-0000-0000-000000000001',
   '99999999-1111-0000-0000-000000000001', 'active', 'admin_added', '2026-06-01T00:00:00Z'),
  ('99999999-5555-0000-0000-000000000002', '99999999-4444-0000-0000-000000000002',
   '99999999-1111-0000-0000-000000000001', 'active', 'admin_added', '2027-01-17T00:00:00Z'),
  ('99999999-5555-0000-0000-000000000003', '99999999-4444-0000-0000-000000000003',
   '99999999-1111-0000-0000-000000000001', 'active', 'admin_added', '2027-02-05T00:00:00Z');

-- Active monthly-dues charge, 31000 XAF (round month math).
INSERT INTO finance.charges
  (id, scope_id, shape, name, base_amount, currency, recurrence, activation_date, status)
VALUES
  ('99999999-cccc-0000-0000-000000000001', '99999999-1111-0000-0000-000000000001',
   'charge', 'E3.3 Monthly Dues', 31000, 'XAF', 'monthly', '2027-01-01T00:00:00Z', 'active');

-- Draft charge (status='draft') for the draft-skip test.
INSERT INTO finance.charges
  (id, scope_id, shape, name, base_amount, currency, recurrence, activation_date, status)
VALUES
  ('99999999-cccc-0000-0000-000000000002', '99999999-1111-0000-0000-000000000001',
   'charge', 'E3.3 Draft Dues', 5000, 'XAF', 'monthly', '2027-01-01T00:00:00Z', 'draft');

-- Goal-shape charge for the non-obligation-shape skip test.
INSERT INTO finance.charges
  (id, scope_id, shape, name, currency, goal_amount, lifecycle, open_date, close_date, status)
VALUES
  ('99999999-cccc-0000-0000-000000000003', '99999999-1111-0000-0000-000000000001',
   'goal', 'E3.3 Goal', 'XAF', 100000, 'open', '2027-01-01T00:00:00Z', '2027-03-01T00:00:00Z', 'active');

-- Branch-targeted charge for the deferred-M3 skip test.
INSERT INTO finance.charges
  (id, scope_id, shape, name, base_amount, currency, recurrence, activation_date, status, target_party_type)
VALUES
  ('99999999-cccc-0000-0000-000000000004', '99999999-1111-0000-0000-000000000001',
   'charge', 'E3.3 Branch Levy', 1000000, 'XAF', 'yearly', '2027-01-01T00:00:00Z', 'active', 'branch');

-------------------------------------------------------------------------------
-- A) compute_period(monthly, 1, Feb 15 2027) → Feb 1 – Mar 1
-------------------------------------------------------------------------------

SELECT is(
  (SELECT period_start FROM finance.compute_period('monthly', 1, '2027-02-15T00:00:00Z'::timestamptz)),
  '2027-02-01'::date,
  'compute_period(monthly, 1, Feb 15) → Feb 1'
);

-------------------------------------------------------------------------------
-- B) compute_period(quarterly, 1, Feb 15 2027) → Jan 1 – Apr 1
-------------------------------------------------------------------------------

SELECT is(
  (SELECT period_start FROM finance.compute_period('quarterly', 1, '2027-02-15T00:00:00Z'::timestamptz)),
  '2027-01-01'::date,
  'compute_period(quarterly, 1, Feb 15) → Q1 starts Jan 1'
);

-------------------------------------------------------------------------------
-- C) compute_period(yearly, 1, 2027-06-15) → 2027 Jan 1 – 2028 Jan 1
-------------------------------------------------------------------------------

SELECT is(
  (SELECT period_end FROM finance.compute_period('yearly', 1, '2027-06-15T00:00:00Z'::timestamptz)),
  '2028-01-01'::date,
  'compute_period(yearly, 1, mid-2027) → ends 2028-01-01'
);

-------------------------------------------------------------------------------
-- D) compute_period rejects one_time
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ SELECT * FROM finance.compute_period('one_time', 1, NOW()) $$,
  '22023',
  NULL,
  'compute_period rejects one_time (invalid parameter)'
);

-------------------------------------------------------------------------------
-- E) generate_obligations_for_charge inserts one per member (long-time + mid)
-------------------------------------------------------------------------------
-- Reference: 2027-01-20 (during January). Late-joiner (joined Feb 5) is
-- after period.end so no obligation. Long-time (joined 2026) gets the
-- full 31000. Mid-period (joined Jan 17, 14 days in) gets prorated:
-- 15 days owed / 31 days total * 31000 = 15000.

SELECT is(
  (SELECT finance.generate_obligations_for_charge(
    '99999999-cccc-0000-0000-000000000001'::uuid,
    '2027-01-20T12:00:00Z'::timestamptz
  )),
  2,
  'generate_obligations_for_charge inserts 2 obligations (long-time + mid); late-joiner is post-period'
);

-------------------------------------------------------------------------------
-- F) idempotent — second call adds 0 (UNIQUE constraint short-circuits)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT finance.generate_obligations_for_charge(
    '99999999-cccc-0000-0000-000000000001'::uuid,
    '2027-01-20T12:00:00Z'::timestamptz
  )),
  0,
  'generate_obligations_for_charge is idempotent — second call adds 0 for the same period'
);

-------------------------------------------------------------------------------
-- G) mid-period joiner got the prorated 15000, long-time got full 31000
-------------------------------------------------------------------------------

SELECT is(
  (SELECT amount FROM finance.obligations
     WHERE charge_id = '99999999-cccc-0000-0000-000000000001'
       AND party_id  = '99999999-4444-0000-0000-000000000001'  -- long-time
       AND period_start = '2027-01-01'),
  31000.0000::numeric,
  'long-time member got full 31000 for January period'
);

SELECT is(
  (SELECT amount FROM finance.obligations
     WHERE charge_id = '99999999-cccc-0000-0000-000000000001'
       AND party_id  = '99999999-4444-0000-0000-000000000002'  -- mid-period
       AND period_start = '2027-01-01'),
  15000.0000::numeric,
  'mid-period joiner got prorated 15000 for January period (15/31 * 31000)'
);

-------------------------------------------------------------------------------
-- H) draft charge — no obligations generated
-------------------------------------------------------------------------------

SELECT is(
  (SELECT finance.generate_obligations_for_charge(
    '99999999-cccc-0000-0000-000000000002'::uuid,   -- draft charge
    '2027-01-20T12:00:00Z'::timestamptz
  )),
  0,
  'generate_obligations_for_charge on a draft charge returns 0'
);

-------------------------------------------------------------------------------
-- I) goal shape — no obligations generated
-------------------------------------------------------------------------------

SELECT is(
  (SELECT finance.generate_obligations_for_charge(
    '99999999-cccc-0000-0000-000000000003'::uuid,   -- goal shape
    '2027-01-20T12:00:00Z'::timestamptz
  )),
  0,
  'generate_obligations_for_charge on a goal shape returns 0 (voluntary, no arrears)'
);

-------------------------------------------------------------------------------
-- J) M1 obligation freeze still holds post-generation
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ UPDATE finance.obligations
        SET amount = 5
      WHERE charge_id = '99999999-cccc-0000-0000-000000000001'
        AND party_id  = '99999999-4444-0000-0000-000000000001' $$,
  '42501',
  NULL,
  'obligation.amount is still frozen after generation (M1 trigger intact under M2B path)'
);

-------------------------------------------------------------------------------
-- K) branch-as-body targeting is deferred to M3 — returns 0 with a notice
-------------------------------------------------------------------------------

SELECT is(
  (SELECT finance.generate_obligations_for_charge(
    '99999999-cccc-0000-0000-000000000004'::uuid,   -- branch-targeted
    '2027-06-15T12:00:00Z'::timestamptz
  )),
  0,
  'generate_obligations_for_charge on a branch-targeted charge returns 0 (M2B v1 defers to M3)'
);

SELECT * FROM finish();
ROLLBACK;
