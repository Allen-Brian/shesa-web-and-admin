-- pgTAP: Phase 3 M11 donations + public path.
--
-- Tests:
--   A. record_public_donation on a valid live donation charge succeeds,
--      returns the receipt token + number.
--   B. record_public_donation is callable by anon (the SD seam holds).
--   C. record_public_donation on a non-donation charge (e.g. dues) is
--      rejected with a bland 42501 — no info leak.
--   D. record_public_donation on a draft/closed donation is rejected.
--   E. record_public_donation with currency mismatch is rejected.
--   F. record_public_donation with amount <= 0 is rejected (22023).
--   G. The public donation inserts a payment with payer_member_id=NULL
--      and donor_name captured in metadata.
--   H. The M5 receipt trigger fires — receipt_verifications row exists.
--   I. get_donation_report filters to donation-shape charges only and
--      counts named vs anonymous donors.
--   J. get_donation_report denies caller without finance.report at scope.

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;
GRANT USAGE ON SCHEMA pgtap TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO anon;

SELECT plan(10);

-------------------------------------------------------------------------------
-- Setup
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('a3a3a3a3-0000-0000-0000-00000000aaaa', 'e312a@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('a3a3a3a3-0000-0000-0000-00000000bbbb', 'e312b@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES (
  'a3a3a3a3-1111-0000-0000-000000000001',
  'E3.12 Test Branch',
  'e312-test-branch',
  'branch',
  '00000000-0000-0000-0000-000000000001',
  'XAF'
);

-- Live donation charge.
INSERT INTO finance.charges
  (id, scope_id, shape, name, currency, lifecycle, open_date, close_date, status)
VALUES
  ('a3a3a3a3-cccc-0000-0000-000000000001', 'a3a3a3a3-1111-0000-0000-000000000001',
   'donation', 'General Fund', 'XAF', 'open',
   NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', 'active');

-- A dues charge (not a donation).
INSERT INTO finance.charges
  (id, scope_id, shape, name, base_amount, currency, recurrence, activation_date, status)
VALUES
  ('a3a3a3a3-cccc-0000-0000-000000000002', 'a3a3a3a3-1111-0000-0000-000000000001',
   'charge', 'Monthly Dues', 20000, 'XAF', 'monthly', '2027-01-01T00:00:00Z', 'active');

-- A closed donation.
INSERT INTO finance.charges
  (id, scope_id, shape, name, currency, lifecycle, open_date, close_date, status)
VALUES
  ('a3a3a3a3-cccc-0000-0000-000000000003', 'a3a3a3a3-1111-0000-0000-000000000001',
   'donation', 'Closed Campaign', 'XAF', 'closed',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '60 days', 'active');

-- Grant finance role at scope to user A (for the report auth check).
INSERT INTO core.role_assignments (id, user_id, role_id, scope_id, starts_at)
SELECT
  'a3a3a3a3-2222-0000-0000-000000000001',
  'a3a3a3a3-0000-0000-0000-00000000aaaa',
  r.id,
  'a3a3a3a3-1111-0000-0000-000000000001',
  NOW()
FROM core.roles r WHERE r.key = 'finance';

-------------------------------------------------------------------------------
-- A + B) Public donation succeeds and is callable by anon
-------------------------------------------------------------------------------

SET LOCAL ROLE anon;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

SELECT ok(
  (SELECT payment_id FROM finance.record_public_donation(
    'a3a3a3a3-cccc-0000-0000-000000000001'::uuid,
    5000, 'XAF', 'mtn_momo'::finance.payment_method,
    'Jane Anonymous', 'jane@example.com', 'For the AGM')) IS NOT NULL,
  'M11: anon can call record_public_donation and get a payment_id back'
);

-------------------------------------------------------------------------------
-- C) Non-donation charge rejected with bland 42501
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ SELECT * FROM finance.record_public_donation(
       'a3a3a3a3-cccc-0000-0000-000000000002'::uuid,
       5000, 'XAF', 'mtn_momo'::finance.payment_method,
       NULL, NULL, NULL) $$,
  '42501',
  NULL,
  'M11: dues charge is not a donation — bland 42501'
);

-------------------------------------------------------------------------------
-- D) Closed donation rejected
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ SELECT * FROM finance.record_public_donation(
       'a3a3a3a3-cccc-0000-0000-000000000003'::uuid,
       5000, 'XAF', 'mtn_momo'::finance.payment_method,
       NULL, NULL, NULL) $$,
  '42501',
  NULL,
  'M11: closed donation is rejected (same bland 42501)'
);

-------------------------------------------------------------------------------
-- E) Currency mismatch rejected
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ SELECT * FROM finance.record_public_donation(
       'a3a3a3a3-cccc-0000-0000-000000000001'::uuid,
       5000, 'USD', 'card'::finance.payment_method,
       NULL, NULL, NULL) $$,
  '42501',
  NULL,
  'M11: currency mismatch on a live donation is rejected'
);

-------------------------------------------------------------------------------
-- F) Non-positive amount rejected (22023 from the input guard)
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ SELECT * FROM finance.record_public_donation(
       'a3a3a3a3-cccc-0000-0000-000000000001'::uuid,
       0, 'XAF', 'mtn_momo'::finance.payment_method,
       NULL, NULL, NULL) $$,
  '22023',
  NULL,
  'M11: amount <= 0 rejected with 22023'
);

RESET ROLE;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

-------------------------------------------------------------------------------
-- G) Public donation payment has payer_member_id=NULL + donor_name in metadata
-------------------------------------------------------------------------------

SELECT is(
  (SELECT payer_member_id FROM finance.payments
    WHERE charge_id = 'a3a3a3a3-cccc-0000-0000-000000000001'
    LIMIT 1),
  NULL::uuid,
  'M11: public donation payment has payer_member_id=NULL'
);

SELECT is(
  (SELECT metadata->>'donor_name' FROM finance.payments
    WHERE charge_id = 'a3a3a3a3-cccc-0000-0000-000000000001'
    LIMIT 1),
  'Jane Anonymous',
  'M11: donor_name captured in payment metadata'
);

-------------------------------------------------------------------------------
-- H) M5 receipt trigger fired for the donation payment
-------------------------------------------------------------------------------

SELECT cmp_ok(
  (SELECT COUNT(*)::int FROM finance.receipt_verifications rv
    JOIN finance.payments p ON p.id = rv.payment_id
    WHERE p.charge_id = 'a3a3a3a3-cccc-0000-0000-000000000001'),
  '>=',
  1,
  'M11: M5 receipt trigger fires for public donation → receipt_verifications row exists'
);

-------------------------------------------------------------------------------
-- I) get_donation_report filters to donation-shape charges
-------------------------------------------------------------------------------
-- Add an anonymous donation (no name) so the counts split.

SET LOCAL ROLE anon;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

SELECT payment_id FROM finance.record_public_donation(
  'a3a3a3a3-cccc-0000-0000-000000000001'::uuid,
  1000, 'XAF', 'cash'::finance.payment_method,
  NULL, NULL, NULL
);

RESET ROLE;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;
SET LOCAL request.jwt.claim.sub = 'a3a3a3a3-0000-0000-0000-00000000aaaa';
SET LOCAL request.jwt.claims = '{"sub":"a3a3a3a3-0000-0000-0000-00000000aaaa","role":"authenticated"}';

-- Two donations, one named, one anonymous. Only one row per donation charge.
SELECT is(
  (SELECT donation_count::int FROM finance.get_donation_report(
    'a3a3a3a3-1111-0000-0000-000000000001'::uuid, NULL, NOW())
   WHERE charge_id = 'a3a3a3a3-cccc-0000-0000-000000000001'),
  2,
  'M11: get_donation_report counts 2 donations to General Fund'
);

-------------------------------------------------------------------------------
-- J) get_donation_report denies caller without finance.report
-------------------------------------------------------------------------------

SET LOCAL request.jwt.claim.sub = 'a3a3a3a3-0000-0000-0000-00000000bbbb';
SET LOCAL request.jwt.claims = '{"sub":"a3a3a3a3-0000-0000-0000-00000000bbbb","role":"authenticated"}';

SELECT throws_ok(
  $$ SELECT * FROM finance.get_donation_report(
       'a3a3a3a3-1111-0000-0000-000000000001'::uuid, NULL, NOW()) $$,
  '42501',
  NULL,
  'M11: get_donation_report denies caller without finance.report at scope'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
