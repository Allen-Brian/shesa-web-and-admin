-- pgTAP: sandbox / live payment modes.
--
-- The rule these assertions exist to hold: **a test settlement can never
-- reach the books.** `finance.payments` mints a verifiable receipt, writes
-- a ledger entry, moves the treasury, and cannot be deleted or updated —
-- so a sandbox transaction landing there is permanent and indistinguishable
-- from real money.
--
-- The integration code is in Deno and could get this wrong. These are the
-- constraints that mean it cannot:
--
--   A. `mode` has no default — an insert that does not state it fails.
--   B. A settlement's mode must match its intent's, in both directions.
--   C. A replayed gateway reference makes one settlement, not two.
--   D. `finance.sandbox_payments` carries none of `finance.payments`'
--      triggers, and a sandbox settlement moves no ledger or treasury.
--   E. anon cannot read sandbox settlements — they carry payer PII.

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;
GRANT USAGE ON SCHEMA pgtap TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO anon;

SELECT plan(12);

-------------------------------------------------------------------------------
-- Setup
-------------------------------------------------------------------------------

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES (
  'eeee0000-1111-0000-0000-000000000001',
  'E3.15 Test Branch',
  'e315-test-branch',
  'branch',
  '00000000-0000-0000-0000-000000000001',
  'XAF'
);

-- A charge sits directly on a scope; finance.groups is a mainstream-only
-- construct and this test does not need one.
INSERT INTO finance.charges
  (id, scope_id, shape, name, base_amount, currency, recurrence, activation_date, status)
VALUES (
  'eeee0000-3333-0000-0000-000000000001',
  'eeee0000-1111-0000-0000-000000000001',
  'charge', 'E3.15 Dues', 20000, 'XAF', 'monthly', '2027-01-01T00:00:00Z', 'active'
);

-- One intent per mode, both pending.
INSERT INTO finance.payment_intents
  (id, charge_id, scope_id, amount, currency, method, status, mode)
VALUES
  ('eeee0000-4444-0000-0000-00000000aaaa',
   'eeee0000-3333-0000-0000-000000000001', 'eeee0000-1111-0000-0000-000000000001',
   20000, 'XAF', 'mtn_momo', 'pending', 'sandbox'),
  ('eeee0000-4444-0000-0000-00000000bbbb',
   'eeee0000-3333-0000-0000-000000000001', 'eeee0000-1111-0000-0000-000000000001',
   20000, 'XAF', 'mtn_momo', 'pending', 'live');

-------------------------------------------------------------------------------
-- A) `mode` has no default
-------------------------------------------------------------------------------
-- Silently defaulting to 'live' is how a sandbox settlement reaches the
-- books. An insert that does not say which world it belongs to is a bug,
-- and it should read as one.

SELECT throws_ok(
  $$ INSERT INTO finance.payment_intents (charge_id, scope_id, amount, currency, method)
     VALUES ('eeee0000-3333-0000-0000-000000000001',
             'eeee0000-1111-0000-0000-000000000001',
             20000, 'XAF', 'mtn_momo') $$,
  '23502',
  NULL,
  'payment_intents: an insert that omits mode raises 23502 rather than defaulting'
);

-------------------------------------------------------------------------------
-- B) A settlement's mode must match its intent's — both directions
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO finance.sandbox_payments
       (intent_id, scope_id, charge_id, amount, currency, method)
     VALUES ('eeee0000-4444-0000-0000-00000000bbbb',
             'eeee0000-1111-0000-0000-000000000001',
             'eeee0000-3333-0000-0000-000000000001',
             20000, 'XAF', 'mtn_momo') $$,
  '23514',
  NULL,
  'sandbox_payments: a LIVE intent cannot settle into the sandbox table'
);

SELECT throws_ok(
  $$ INSERT INTO finance.sandbox_payments
       (intent_id, scope_id, charge_id, amount, currency, method)
     VALUES ('eeee0000-9999-0000-0000-000000000000',
             'eeee0000-1111-0000-0000-000000000001',
             'eeee0000-3333-0000-0000-000000000001',
             20000, 'XAF', 'mtn_momo') $$,
  '23503',
  NULL,
  'sandbox_payments: an unknown intent is refused'
);

SELECT lives_ok(
  $$ INSERT INTO finance.sandbox_payments
       (id, intent_id, scope_id, charge_id, amount, currency, method, provider_ref,
        gateway_amount, gateway_currency, gateway_fee, gateway_net_amount)
     VALUES ('eeee0000-5555-0000-0000-000000000001',
             'eeee0000-4444-0000-0000-00000000aaaa',
             'eeee0000-1111-0000-0000-000000000001',
             'eeee0000-3333-0000-0000-000000000001',
             20000, 'XAF', 'mtn_momo', 'REQ-E315-0001',
             20000, 'XAF', 400, 19600) $$,
  'sandbox_payments: a SANDBOX intent settles into the sandbox table'
);

-- The reverse half of the invariant lives on the intent as a CHECK, so no
-- code path can point a sandbox intent at finance.payments.
SELECT throws_ok(
  $$ UPDATE finance.payment_intents
        SET status = 'succeeded', resulting_payment_id = gen_random_uuid()
      WHERE id = 'eeee0000-4444-0000-0000-00000000aaaa' $$,
  '23514',
  NULL,
  'payment_intents: a SANDBOX intent cannot reference finance.payments'
);

SELECT throws_ok(
  $$ UPDATE finance.payment_intents
        SET status = 'succeeded', sandbox_payment_id = 'eeee0000-5555-0000-0000-000000000001'
      WHERE id = 'eeee0000-4444-0000-0000-00000000bbbb' $$,
  '23514',
  NULL,
  'payment_intents: a LIVE intent cannot reference finance.sandbox_payments'
);

SELECT lives_ok(
  $$ UPDATE finance.payment_intents
        SET status = 'succeeded', sandbox_payment_id = 'eeee0000-5555-0000-0000-000000000001'
      WHERE id = 'eeee0000-4444-0000-0000-00000000aaaa' $$,
  'payment_intents: a SANDBOX intent settles by pointing at sandbox_payments'
);

-------------------------------------------------------------------------------
-- C) A replayed gateway reference makes one settlement
-------------------------------------------------------------------------------
-- Tranzak's webhook carries no signature — only an `authKey` echoed in the
-- body — so the handler has to be safe against replay by construction, not
-- by trusting the sender.

SELECT throws_ok(
  $$ INSERT INTO finance.sandbox_payments
       (intent_id, scope_id, charge_id, amount, currency, method, provider_ref)
     VALUES ('eeee0000-4444-0000-0000-00000000aaaa',
             'eeee0000-1111-0000-0000-000000000001',
             'eeee0000-3333-0000-0000-000000000001',
             20000, 'XAF', 'mtn_momo', 'REQ-E315-0001') $$,
  '23505',
  NULL,
  'sandbox_payments: replaying a gateway reference conflicts instead of duplicating'
);

-------------------------------------------------------------------------------
-- D) The sandbox table is inert
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM pg_trigger t
     WHERE t.tgrelid = 'finance.sandbox_payments'::regclass
       AND NOT t.tgisinternal
       AND t.tgname <> 'sandbox_payments_require_sandbox_intent'),
  0,
  'sandbox_payments: carries no trigger beyond the mode guard — no ledger, no receipt, no treasury'
);

-- And the consequence, stated directly: the settlement above moved nothing.
SELECT is(
  (SELECT COUNT(*)::int FROM finance.ledger_entries
     WHERE scope_id = 'eeee0000-1111-0000-0000-000000000001'),
  0,
  'sandbox_payments: a sandbox settlement writes no ledger entry'
);

SELECT is(
  (SELECT COUNT(*)::int FROM finance.receipt_verifications rv
     JOIN finance.payments p ON p.id = rv.payment_id
    WHERE p.scope_id = 'eeee0000-1111-0000-0000-000000000001'),
  0,
  'sandbox_payments: a sandbox settlement mints no verifiable receipt'
);

-------------------------------------------------------------------------------
-- E) anon cannot read sandbox settlements
-------------------------------------------------------------------------------
-- They carry payer name, email and phone. SEC-02 was this exact table shape
-- left readable to anon, and it exposed every public payer's contact details.
--
-- anon is refused at the GRANT layer, before RLS is consulted at all —
-- 42501, not an empty result. That is the stronger of the two outcomes and
-- the one worth asserting: a policy can be rewritten by accident, a missing
-- grant cannot be rewritten into existence by one.

SELECT throws_ok(
  $$ SET LOCAL ROLE anon; SELECT COUNT(*) FROM finance.sandbox_payments $$,
  '42501',
  NULL,
  'sandbox_payments: anon is denied at the grant layer, not merely filtered by RLS'
);

SELECT * FROM finish();
ROLLBACK;
