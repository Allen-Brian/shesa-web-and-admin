-- pgTAP: Phase 3 M8 exception resolver + generation integration.
--
-- Tests:
--   A. individual exception wins over a matching batch (fixed) exception
--      — no stacking (spec judgment #9).
--   B. fixed (batch) exception matches when the member's batch is in
--      the condition list.
--   C. relative (recent-exit) exception matches within the window;
--      excludes members outside it.
--   D. senior exception matches long-exited members.
--   E. No matching exception → resolver returns nothing (caller uses
--      base amount).
--   F. is_active=false disables an otherwise-matching exception.
--   G. generate_obligations_for_charge records exception_applied on
--      the obligation for a batch-tier member.
--   H. generate_obligations_for_charge falls back to base_amount when
--      no exception matches for a member.
--   I. get_exchange_rate returns 1 for same-currency.
--   J. get_exchange_rate returns the latest stored rate.

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(11);

-------------------------------------------------------------------------------
-- Setup — a branch, three members with distinct profiles, a dues charge,
--         and four exceptions covering the four forms.
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('a2a2a2a2-0000-0000-0000-00000000aaaa', 'e311a@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES (
  'a2a2a2a2-1111-0000-0000-000000000001',
  'E3.11 Test Branch',
  'e311-test-branch',
  'branch',
  '00000000-0000-0000-0000-000000000001',
  'XAF'
);

-- Members with distinct exit years so relative/senior tests can pick them.
-- Alice: 2012 batch, exit 2012 (recent — 15 years since exit at 2027)
-- Bob:   1998 batch, exit 1998 (senior — 29 years since exit)
-- Carol: 2020 batch, exit 2020 (very recent — 7 years since exit)
INSERT INTO core.members (id, full_name, email, batch_scope_id, house_scope_id, network_scope_id, exit_year)
VALUES
  ('a2a2a2a2-4444-0000-0000-000000000001', 'Alice 2012', 'alice-e311@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-2012'),
   '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001',
   2012),
  ('a2a2a2a2-4444-0000-0000-000000000002', 'Bob 1998', 'bob-e311@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1998'),
   '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001',
   1998),
  ('a2a2a2a2-4444-0000-0000-000000000003', 'Carol 2020', 'carol-e311@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-2020'),
   '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001',
   2020);

INSERT INTO core.memberships (id, member_id, scope_id, membership_status, join_method, joined_at)
VALUES
  ('a2a2a2a2-5555-0000-0000-000000000001', 'a2a2a2a2-4444-0000-0000-000000000001',
   'a2a2a2a2-1111-0000-0000-000000000001', 'active', 'admin_added', '2026-06-01T00:00:00Z'),
  ('a2a2a2a2-5555-0000-0000-000000000002', 'a2a2a2a2-4444-0000-0000-000000000002',
   'a2a2a2a2-1111-0000-0000-000000000001', 'active', 'admin_added', '2026-06-01T00:00:00Z'),
  ('a2a2a2a2-5555-0000-0000-000000000003', 'a2a2a2a2-4444-0000-0000-000000000003',
   'a2a2a2a2-1111-0000-0000-000000000001', 'active', 'admin_added', '2026-06-01T00:00:00Z');

-- Dues: 25000 base.
INSERT INTO finance.charges
  (id, scope_id, shape, name, base_amount, currency, recurrence, activation_date, status)
VALUES
  ('a2a2a2a2-cccc-0000-0000-000000000001', 'a2a2a2a2-1111-0000-0000-000000000001',
   'charge', 'E3.11 Dues', 25000, 'XAF', 'monthly', '2027-01-01T00:00:00Z', 'active');

-- Four exceptions on this charge.
INSERT INTO finance.exceptions
  (id, charge_id, form, condition, replacement_amount, priority, member_id, is_active)
VALUES
  -- Batch tier: 2012 batch pays 5000 (fixed form)
  ('a2a2a2a2-9999-0000-0000-000000000001',
   'a2a2a2a2-cccc-0000-0000-000000000001',
   'fixed',
   jsonb_build_object('batch_scope_ids',
     jsonb_build_array((SELECT id::text FROM core.scopes WHERE slug = 'batch-2012'))),
   5000, 100, NULL, TRUE),
  -- Individual override: Alice pays 1000 (president's relief)
  ('a2a2a2a2-9999-0000-0000-000000000002',
   'a2a2a2a2-cccc-0000-0000-000000000001',
   'individual',
   '{}'::jsonb,
   1000, 1000, 'a2a2a2a2-4444-0000-0000-000000000001', TRUE),
  -- Relative: exited in the last 8 years pays 2500 (Carol qualifies, Alice does not — 15 years)
  ('a2a2a2a2-9999-0000-0000-000000000003',
   'a2a2a2a2-cccc-0000-0000-000000000001',
   'relative',
   '{"max_years_since_exit": 8}'::jsonb,
   2500, 500, NULL, TRUE),
  -- Senior: exited more than 20 years ago pays 500 (Bob qualifies at 29 years)
  ('a2a2a2a2-9999-0000-0000-000000000004',
   'a2a2a2a2-cccc-0000-0000-000000000001',
   'senior',
   '{"min_years_since_exit": 20}'::jsonb,
   500, 500, NULL, TRUE);

-------------------------------------------------------------------------------
-- A) Individual wins over batch (Alice matches both; expects 1000)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT replacement_amount FROM finance.resolve_exception_for_charge(
    'a2a2a2a2-cccc-0000-0000-000000000001'::uuid,
    'a2a2a2a2-4444-0000-0000-000000000001'::uuid,
    '2027-06-01T00:00:00Z'::timestamptz)),
  1000.0000::numeric,
  'M8: individual (1000) wins over fixed (100) for Alice — no stacking'
);

-------------------------------------------------------------------------------
-- B) fixed matches for a member in the batch list (Alice, without the
--    individual override — remove it first to test the batch path)
-------------------------------------------------------------------------------

UPDATE finance.exceptions SET is_active = FALSE
 WHERE id = 'a2a2a2a2-9999-0000-0000-000000000002';   -- disable individual for Alice

SELECT is(
  (SELECT replacement_amount FROM finance.resolve_exception_for_charge(
    'a2a2a2a2-cccc-0000-0000-000000000001'::uuid,
    'a2a2a2a2-4444-0000-0000-000000000001'::uuid,
    '2027-06-01T00:00:00Z'::timestamptz)),
  5000.0000::numeric,
  'M8: fixed (batch 2012) matches Alice at 5000 when individual is inactive'
);

-- Re-enable the individual for later tests.
UPDATE finance.exceptions SET is_active = TRUE
 WHERE id = 'a2a2a2a2-9999-0000-0000-000000000002';

-------------------------------------------------------------------------------
-- C) relative matches Carol (exit 2020, 7 years since exit at 2027)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT replacement_amount FROM finance.resolve_exception_for_charge(
    'a2a2a2a2-cccc-0000-0000-000000000001'::uuid,
    'a2a2a2a2-4444-0000-0000-000000000003'::uuid,
    '2027-06-01T00:00:00Z'::timestamptz)),
  2500.0000::numeric,
  'M8: relative (max_years_since_exit=8) matches Carol at 2500 (exit 2020, 7 years)'
);

-------------------------------------------------------------------------------
-- D) senior matches Bob (exit 1998, 29 years since exit)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT replacement_amount FROM finance.resolve_exception_for_charge(
    'a2a2a2a2-cccc-0000-0000-000000000001'::uuid,
    'a2a2a2a2-4444-0000-0000-000000000002'::uuid,
    '2027-06-01T00:00:00Z'::timestamptz)),
  500.0000::numeric,
  'M8: senior (min_years_since_exit=20) matches Bob at 500 (exit 1998, 29 years)'
);

-------------------------------------------------------------------------------
-- E) No matching exception → nothing returned (member uses base amount)
-------------------------------------------------------------------------------
-- Insert a member from a batch NOT covered by any exception, with an
-- exit year of 2015 (12 years since — outside both relative and senior).

INSERT INTO core.members (id, full_name, email, batch_scope_id, house_scope_id, network_scope_id, exit_year)
VALUES
  ('a2a2a2a2-4444-0000-0000-000000000004', 'Dan 2015', 'dan-e311@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1971'),
   '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001',
   2015);

SELECT is(
  (SELECT COUNT(*)::int FROM finance.resolve_exception_for_charge(
    'a2a2a2a2-cccc-0000-0000-000000000001'::uuid,
    'a2a2a2a2-4444-0000-0000-000000000004'::uuid,
    '2027-06-01T00:00:00Z'::timestamptz)),
  0,
  'M8: no matching exception → resolver returns 0 rows; caller uses base'
);

-------------------------------------------------------------------------------
-- F) is_active=false disables an otherwise-matching exception
-------------------------------------------------------------------------------

UPDATE finance.exceptions SET is_active = FALSE
 WHERE id = 'a2a2a2a2-9999-0000-0000-000000000004';   -- disable senior

SELECT is(
  (SELECT COUNT(*)::int FROM finance.resolve_exception_for_charge(
    'a2a2a2a2-cccc-0000-0000-000000000001'::uuid,
    'a2a2a2a2-4444-0000-0000-000000000002'::uuid,
    '2027-06-01T00:00:00Z'::timestamptz)),
  0,
  'M8: is_active=false hides the exception from the resolver'
);

UPDATE finance.exceptions SET is_active = TRUE
 WHERE id = 'a2a2a2a2-9999-0000-0000-000000000004';

-------------------------------------------------------------------------------
-- G) generate_obligations_for_charge records exception_applied
-------------------------------------------------------------------------------
-- Bob is in the 1998 batch AND qualifies as senior (29 years). Senior
-- (500 priority) beats no-fixed-match, so his obligation records the
-- senior exception's id + amount=500.

INSERT INTO core.memberships (id, member_id, scope_id, membership_status, join_method, joined_at)
VALUES
  ('a2a2a2a2-5555-0000-0000-000000000004', 'a2a2a2a2-4444-0000-0000-000000000004',
   'a2a2a2a2-1111-0000-0000-000000000001', 'active', 'admin_added', '2026-06-01T00:00:00Z');

SELECT is(
  finance.generate_obligations_for_charge(
    'a2a2a2a2-cccc-0000-0000-000000000001'::uuid,
    '2027-01-15T12:00:00Z'::timestamptz),
  4,
  'M8: generation runs for all four members'
);

SELECT is(
  (SELECT exception_applied FROM finance.obligations
    WHERE charge_id = 'a2a2a2a2-cccc-0000-0000-000000000001'
      AND party_id  = 'a2a2a2a2-4444-0000-0000-000000000001'
      AND period_start = '2027-01-01'),
  'a2a2a2a2-9999-0000-0000-000000000002'::uuid,
  'M8: Alice''s obligation records the individual exception id'
);

-------------------------------------------------------------------------------
-- H) Fall-back: Dan has no matching exception → amount = base 25000
-------------------------------------------------------------------------------

SELECT is(
  (SELECT amount FROM finance.obligations
    WHERE charge_id = 'a2a2a2a2-cccc-0000-0000-000000000001'
      AND party_id  = 'a2a2a2a2-4444-0000-0000-000000000004'
      AND period_start = '2027-01-01'),
  25000.0000::numeric,
  'M8: Dan (no exception match) gets base amount 25000'
);

-------------------------------------------------------------------------------
-- I + J) exchange rate helper
-------------------------------------------------------------------------------

SELECT is(
  finance.get_exchange_rate('XAF', 'XAF'),
  1::numeric,
  'M8: get_exchange_rate returns 1 for same-currency'
);

INSERT INTO finance.exchange_rates (from_currency, to_currency, rate, effective_at)
VALUES
  ('USD', 'XAF', 600, NOW() - INTERVAL '1 day'),
  ('USD', 'XAF', 620, NOW());   -- most recent wins

SELECT is(
  finance.get_exchange_rate('USD', 'XAF'),
  620::numeric,
  'M8: get_exchange_rate returns the most recent stored rate'
);

SELECT * FROM finish();
ROLLBACK;
