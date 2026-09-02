-- pgTAP: Phase 3 M11 donations — reporting + the retired public write path.
--
-- The anon-executable public write RPCs were REMOVED on 2026-09-02.
-- `finance.record_public_donation` and `record_public_ticket_purchase`
-- inserted a real finance.payments row — firing the ledger writer, the
-- obligation-status recompute and the receipt generator — with no
-- evidence any money had moved, and accepted the full payment_method
-- enum from an unauthenticated caller. The two Fapshi `initiate_public_*`
-- functions went with the provider.
--
-- What this file now covers:
--   A. All four public write RPCs are GONE. These are regression guards:
--      re-introducing any of them re-opens the forgery hole.
--   B. The M5 receipt trigger still fires for a donation payment
--      recorded through the authorized path.
--   C. A donation payment carries payer_member_id=NULL + donor metadata.
--   D. get_donation_report filters to donation-shape charges and counts
--      named vs anonymous donors.
--   E. get_donation_report denies a caller without finance.report at scope.
--
-- Public AGM submissions are covered separately in
-- e3_14_public_agm_registration.test.sql.

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;
GRANT USAGE ON SCHEMA pgtap TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO anon;

SELECT plan(9);

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
-- A) The public write RPCs are gone — regression guards
-------------------------------------------------------------------------------
-- If any of these four start passing again, an unauthenticated caller can
-- mint a settled payment and a verifiable receipt for money nobody
-- collected. Do not "fix" a failure here by restoring the function.

SELECT hasnt_function(
  'finance', 'record_public_donation',
  'SEC-01: finance.record_public_donation is gone — anon can no longer forge a donation payment'
);

SELECT hasnt_function(
  'finance', 'record_public_ticket_purchase',
  'SEC-01: finance.record_public_ticket_purchase is gone — anon can no longer forge a ticket payment'
);

SELECT hasnt_function(
  'finance', 'initiate_public_donation_intent',
  'Fapshi removal: finance.initiate_public_donation_intent is gone'
);

SELECT hasnt_function(
  'finance', 'initiate_public_ticket_intent',
  'Fapshi removal: finance.initiate_public_ticket_intent is gone'
);

-------------------------------------------------------------------------------
-- Record two donations through the privileged path
-------------------------------------------------------------------------------
-- Direct INSERT as the test role. This stands in for what an authorized
-- operator does through payments/record-manual, which checks
-- `payment.record` at the scope before writing.

INSERT INTO finance.payments
  (obligation_id, charge_id, scope_id, payer_member_id,
   amount, currency, method, source, recorded_by, metadata)
VALUES
  (NULL, 'a3a3a3a3-cccc-0000-0000-000000000001', 'a3a3a3a3-1111-0000-0000-000000000001', NULL,
   5000, 'XAF', 'mtn_momo', 'manual', 'a3a3a3a3-0000-0000-0000-00000000aaaa',
   jsonb_build_object('donor_name', 'Jane Anonymous', 'donor_email', 'jane@example.com')),
  (NULL, 'a3a3a3a3-cccc-0000-0000-000000000001', 'a3a3a3a3-1111-0000-0000-000000000001', NULL,
   1000, 'XAF', 'cash', 'manual', 'a3a3a3a3-0000-0000-0000-00000000aaaa',
   '{}'::jsonb);

-------------------------------------------------------------------------------
-- B) M5 receipt trigger still fires
-------------------------------------------------------------------------------

SELECT cmp_ok(
  (SELECT COUNT(*)::int FROM finance.receipt_verifications rv
    JOIN finance.payments p ON p.id = rv.payment_id
    WHERE p.charge_id = 'a3a3a3a3-cccc-0000-0000-000000000001'),
  '>=',
  2,
  'M5 receipt trigger fires for each donation payment'
);

-------------------------------------------------------------------------------
-- C) Donation payment shape
-------------------------------------------------------------------------------

SELECT is(
  (SELECT payer_member_id FROM finance.payments
    WHERE charge_id = 'a3a3a3a3-cccc-0000-0000-000000000001'
      AND amount = 5000
    LIMIT 1),
  NULL::uuid,
  'M11: donation payment has payer_member_id=NULL'
);

SELECT is(
  (SELECT metadata->>'donor_name' FROM finance.payments
    WHERE charge_id = 'a3a3a3a3-cccc-0000-0000-000000000001'
      AND amount = 5000
    LIMIT 1),
  'Jane Anonymous',
  'M11: donor_name captured in payment metadata'
);

-------------------------------------------------------------------------------
-- D) get_donation_report filters to donation-shape charges
-------------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;
SET LOCAL request.jwt.claim.sub = 'a3a3a3a3-0000-0000-0000-00000000aaaa';
SET LOCAL request.jwt.claims = '{"sub":"a3a3a3a3-0000-0000-0000-00000000aaaa","role":"authenticated"}';

SELECT is(
  (SELECT donation_count::int FROM finance.get_donation_report(
    'a3a3a3a3-1111-0000-0000-000000000001'::uuid, NULL, NOW())
   WHERE charge_id = 'a3a3a3a3-cccc-0000-0000-000000000001'),
  2,
  'M11: get_donation_report counts 2 donations to General Fund'
);

-------------------------------------------------------------------------------
-- E) get_donation_report denies caller without finance.report
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
