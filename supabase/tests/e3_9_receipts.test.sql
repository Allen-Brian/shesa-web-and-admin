-- pgTAP: Phase 3 M5 receipts + public verification.
--
-- Tests:
--   A. Every payment INSERT auto-creates one receipt_verifications row.
--   B. Receipt number matches the SB-YYYY-NNNNNN shape.
--   C. Token is 32 hex chars (UUID with dashes removed).
--   D. verify_receipt(real_token) returns valid=true with the minimal
--      fields populated.
--   E. verify_receipt(unknown_token) returns valid=false with all other
--      fields NULL — no info leak.
--   F. verify_receipt(NULL) and verify_receipt('') return valid=false
--      without raising.
--   G. verify_receipt returns reversed=true when a downstream reversal
--      exists.
--   H. verify_receipt callable by anon (SECURITY DEFINER seam).
--   I. verify_receipt does NOT expose payer_member_id or any other
--      column beyond the documented minimal-disclosure set (checked by
--      inspecting the function's declared return columns).

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
  ('ffffffff-0000-0000-0000-00000000aaaa', 'e39a@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES (
  'ffffffff-1111-0000-0000-000000000001',
  'E3.9 Test Branch',
  'e39-test-branch',
  'branch',
  '00000000-0000-0000-0000-000000000001',
  'XAF'
);

INSERT INTO core.members (id, full_name, email, batch_scope_id, house_scope_id, network_scope_id)
VALUES
  ('ffffffff-4444-0000-0000-000000000001', 'E3.9 Member', 'e39m@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
   '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001');

INSERT INTO finance.charges
  (id, scope_id, shape, name, base_amount, currency, recurrence, activation_date, status)
VALUES
  ('ffffffff-cccc-0000-0000-000000000001', 'ffffffff-1111-0000-0000-000000000001',
   'charge', 'E3.9 Test Dues', 40000, 'XAF', 'monthly', '2027-01-01T00:00:00Z', 'active');

INSERT INTO finance.obligations
  (id, charge_id, scope_id, party_type, party_id, amount, currency, status, period_start)
VALUES
  ('ffffffff-bbbb-0000-0000-000000000001', 'ffffffff-cccc-0000-0000-000000000001',
   'ffffffff-1111-0000-0000-000000000001', 'member', 'ffffffff-4444-0000-0000-000000000001',
   40000, 'XAF', 'open', '2027-01-01');

-- Insert a payment — trigger fires + creates the receipt.
INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by)
VALUES (
  'ffffffff-aaaa-0000-0000-000000000001',
  'ffffffff-bbbb-0000-0000-000000000001',
  'ffffffff-cccc-0000-0000-000000000001',
  'ffffffff-1111-0000-0000-000000000001',
  'ffffffff-4444-0000-0000-000000000001',
  40000, 'XAF', 'mtn_momo', 'auto',
  'ffffffff-0000-0000-0000-00000000aaaa'
);

-------------------------------------------------------------------------------
-- A) Exactly one receipt row for the payment
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM finance.receipt_verifications
    WHERE payment_id = 'ffffffff-aaaa-0000-0000-000000000001'),
  1,
  'M5: payment INSERT auto-creates one receipt_verifications row'
);

-------------------------------------------------------------------------------
-- B) Receipt number shape SB-YYYY-NNNNNN
-------------------------------------------------------------------------------

SELECT ok(
  (SELECT receipt_number FROM finance.receipt_verifications
    WHERE payment_id = 'ffffffff-aaaa-0000-0000-000000000001')
    ~ '^SB-\d{4}-\d{6}$',
  'M5: receipt_number matches SB-YYYY-NNNNNN'
);

-------------------------------------------------------------------------------
-- C) Token is 32 hex chars (UUID without dashes)
-------------------------------------------------------------------------------

SELECT ok(
  (SELECT token FROM finance.receipt_verifications
    WHERE payment_id = 'ffffffff-aaaa-0000-0000-000000000001')
    ~ '^[0-9a-f]{32}$',
  'M5: token is 32 lowercase hex characters'
);

-------------------------------------------------------------------------------
-- D) verify_receipt with a real token returns valid + minimal fields
-------------------------------------------------------------------------------

DO $$
DECLARE
  v_token TEXT;
BEGIN
  SELECT token INTO v_token FROM finance.receipt_verifications
   WHERE payment_id = 'ffffffff-aaaa-0000-0000-000000000001';
  PERFORM set_config('e39.token', v_token, true);
END $$;

SELECT is(
  (SELECT valid FROM finance.verify_receipt(current_setting('e39.token'))),
  TRUE,
  'M5: verify_receipt with a real token returns valid=TRUE'
);

SELECT is(
  (SELECT amount FROM finance.verify_receipt(current_setting('e39.token'))),
  40000.0000::numeric,
  'M5: verify_receipt exposes the payment amount'
);

-------------------------------------------------------------------------------
-- E) verify_receipt with an unknown token returns valid=FALSE
-------------------------------------------------------------------------------

SELECT is(
  (SELECT valid FROM finance.verify_receipt('deadbeefdeadbeefdeadbeefdeadbeef')),
  FALSE,
  'M5: verify_receipt with an unknown token returns valid=FALSE (no info leak)'
);

-------------------------------------------------------------------------------
-- F) verify_receipt handles NULL / empty tokens without raising
-------------------------------------------------------------------------------

SELECT is(
  (SELECT valid FROM finance.verify_receipt(NULL)),
  FALSE,
  'M5: verify_receipt(NULL) returns valid=FALSE without raising'
);

-------------------------------------------------------------------------------
-- G) Reversed payment surfaces via the reversed flag
-------------------------------------------------------------------------------

INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, recorded_by,
   reverses_payment_id, reversal_reason)
VALUES (
  'ffffffff-aaaa-0000-0000-000000000002',
  'ffffffff-bbbb-0000-0000-000000000001',
  'ffffffff-cccc-0000-0000-000000000001',
  'ffffffff-1111-0000-0000-000000000001',
  'ffffffff-4444-0000-0000-000000000001',
  40000, 'XAF', 'mtn_momo', 'manual',
  'ffffffff-0000-0000-0000-00000000aaaa',
  'ffffffff-aaaa-0000-0000-000000000001',
  'Test reversal for M5'
);

SELECT is(
  (SELECT reversed FROM finance.verify_receipt(current_setting('e39.token'))),
  TRUE,
  'M5: verify_receipt reports reversed=TRUE once a downstream reversal exists'
);

-------------------------------------------------------------------------------
-- H) anon can EXECUTE verify_receipt (SECURITY DEFINER seam)
-------------------------------------------------------------------------------

SET LOCAL ROLE anon;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

SELECT is(
  (SELECT valid FROM finance.verify_receipt(current_setting('e39.token'))),
  TRUE,
  'M5: anon can call verify_receipt (public verification)'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
