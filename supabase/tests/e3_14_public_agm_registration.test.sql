-- pgTAP: the public AGM 2026 submission surface, and the two critical
-- holes closed alongside it.
--
-- Context: Fapshi was removed on 2026-09-02 and no payment provider is
-- connected (Tranzak is intended). Public AGM submissions are captured
-- in cms.agm_registrations and settled out-of-band. The defining
-- property — the one every assertion here exists to protect — is that a
-- public submission touches NOTHING in the finance schema.
--
-- Tests:
--   A. anon can submit and receives a reference.
--   B. The submission writes NO payment, NO ledger entry, NO receipt.
--   C. Phone is mandatory at the database, not just in the form.
--   D. Quantity is bounded.
--   E. anon cannot READ the registrations it can write (PII).
--   F. SEC-02 regression: anon cannot read finance.payment_intents.
--   G. Finance can read registrations; a member without finance cannot.

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, finance, cms, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;
GRANT USAGE ON SCHEMA pgtap TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO anon;

SELECT plan(12);

-------------------------------------------------------------------------------
-- Setup
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('a5a5a5a5-0000-0000-0000-00000000aaaa', 'e314fin@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('a5a5a5a5-0000-0000-0000-00000000bbbb', 'e314nobody@shesa.test', '00000000-0000-0000-0000-000000000000');

-- Global finance grant (NULL scope) for the reader check.
INSERT INTO core.role_assignments (id, user_id, role_id, scope_id, starts_at)
SELECT
  'a5a5a5a5-2222-0000-0000-000000000001',
  'a5a5a5a5-0000-0000-0000-00000000aaaa',
  r.id,
  (SELECT id FROM core.scopes WHERE scope_type = 'mainstream' LIMIT 1),
  NOW()
FROM core.roles r WHERE r.key = 'finance';

-- Baseline the finance tables BEFORE any submission. `supabase test db`
-- runs against a seeded database, so an absolute "count is zero" would
-- assert against the seed rather than against a regression. What matters
-- is that a public submission changes nothing.
CREATE TEMP TABLE e314_baseline AS
SELECT
  (SELECT COUNT(*) FROM finance.payments)              AS payments,
  (SELECT COUNT(*) FROM finance.receipt_verifications) AS receipts,
  (SELECT COUNT(*) FROM finance.ledger_entries)        AS ledger,
  (SELECT COUNT(*) FROM finance.payment_intents)       AS intents;

-------------------------------------------------------------------------------
-- A) anon can submit
-------------------------------------------------------------------------------

SET LOCAL ROLE anon;
SET LOCAL search_path = pgtap, public, audit, core, finance, cms, auth;

SELECT matches(
  (SELECT reference FROM cms.submit_agm_registration(
     'ticket', 'Ndifon Peter', '677123456', 20000, 'pay-now',
     'peter@example.com', 1, NULL, NULL)),
  '^AGM-[0-9A-F]{10}$',
  'anon can submit an AGM registration and receives a well-formed reference'
);

-------------------------------------------------------------------------------
-- C) Phone is mandatory at the database
-------------------------------------------------------------------------------
-- The form and the server action both check too; this is the check that
-- holds against a direct RPC call.

SELECT throws_ok(
  $$ SELECT * FROM cms.submit_agm_registration(
       'ticket', 'No Phone', '', 20000, 'cash-on-site', NULL, 1, NULL, NULL) $$,
  '22023',
  NULL,
  'phone is required — a blank phone is rejected at the RPC'
);

SELECT throws_ok(
  $$ SELECT * FROM cms.submit_agm_registration(
       'ticket', 'Short Phone', '12345', 20000, 'cash-on-site', NULL, 1, NULL, NULL) $$,
  '22023',
  NULL,
  'phone shorter than a Cameroonian mobile number is rejected'
);

-------------------------------------------------------------------------------
-- D) Quantity is bounded
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ SELECT * FROM cms.submit_agm_registration(
       'ticket', 'Bulk Buyer', '677123456', 20000, 'cash-on-site', NULL, 5000, NULL, NULL) $$,
  '22023',
  NULL,
  'quantity above the ceiling is rejected — a public form cannot open an unbounded row'
);

-------------------------------------------------------------------------------
-- E) anon cannot read what it just wrote
-------------------------------------------------------------------------------
-- Registrant contact details are exactly the PII that SEC-02 leaked and
-- that the predecessor cms.agm_tickets exposed with USING (TRUE).

SELECT throws_ok(
  $$ SELECT count(*) FROM cms.agm_registrations $$,
  '42501',
  NULL,
  'anon cannot read cms.agm_registrations — no table grant at all'
);

-------------------------------------------------------------------------------
-- F) SEC-02 regression guard
-------------------------------------------------------------------------------
-- The Fapshi status policy admitted every public-flow row to every
-- anonymous caller: payer name, email, phone, location, amount and the
-- raw provider webhook body. Both the policy and the grant are gone.

SELECT throws_ok(
  $$ SELECT count(*) FROM finance.payment_intents $$,
  '42501',
  NULL,
  'SEC-02: anon cannot read finance.payment_intents'
);

RESET ROLE;
SET LOCAL search_path = pgtap, public, audit, core, finance, cms, auth;

-------------------------------------------------------------------------------
-- B) The submission touched nothing in finance
-------------------------------------------------------------------------------
-- The whole point. A registration is an intention, not a settlement.

SELECT is(
  (SELECT COUNT(*) FROM finance.payments),
  (SELECT payments FROM e314_baseline),
  'a public AGM submission creates NO finance.payments row'
);

SELECT is(
  (SELECT COUNT(*) FROM finance.receipt_verifications),
  (SELECT receipts FROM e314_baseline),
  'a public AGM submission creates NO receipt — nothing that verify_receipt would validate'
);

SELECT is(
  (SELECT COUNT(*) FROM finance.ledger_entries),
  (SELECT ledger FROM e314_baseline),
  'a public AGM submission writes NO ledger entry — the treasury balance is untouched'
);

SELECT is(
  (SELECT COUNT(*) FROM finance.payment_intents),
  (SELECT intents FROM e314_baseline),
  'a public AGM submission creates NO payment intent either — capture is entirely in cms'
);

-------------------------------------------------------------------------------
-- G) Read access is gated on finance authority
-------------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, finance, cms, auth;
SET LOCAL request.jwt.claim.sub = 'a5a5a5a5-0000-0000-0000-00000000aaaa';
SET LOCAL request.jwt.claims = '{"sub":"a5a5a5a5-0000-0000-0000-00000000aaaa","role":"authenticated"}';

SELECT is(
  (SELECT COUNT(*)::int FROM cms.agm_registrations),
  1,
  'a finance role at Mainstream can read the registrations'
);

SET LOCAL request.jwt.claim.sub = 'a5a5a5a5-0000-0000-0000-00000000bbbb';
SET LOCAL request.jwt.claims = '{"sub":"a5a5a5a5-0000-0000-0000-00000000bbbb","role":"authenticated"}';

SELECT is(
  (SELECT COUNT(*)::int FROM cms.agm_registrations),
  0,
  'an authenticated user without finance authority sees no registrations'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
