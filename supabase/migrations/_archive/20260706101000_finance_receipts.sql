-- Migration: finance_receipts
--
-- Phase 3 M5 — receipts + public verification. Spec Part VIII.
--
-- A receipt is a rendered view of an immutable payment, not a stored
-- document. What we DO store:
--   * A verification token (URL-safe, high entropy) — the QR code encodes
--     this token; scanning the paper receipt hits verify_receipt(token).
--   * A human-readable receipt number (SB-YYYY-NNNNNN) — printed on the
--     paper so a hand-typed lookup also works.
--
-- Auto-generation:
--   Every payment INSERT (originals + reversals) fires a trigger that
--   INSERTs the matching receipt_verifications row. Callers don't have
--   to remember to generate — the paper can always be produced from the
--   payment row + the verification token.
--
-- Public verification:
--   finance.verify_receipt(token) is SECURITY DEFINER + granted to anon
--   + returns MINIMAL disclosure per the locked spec judgment (#6):
--     receipt_number, amount, currency, paid_at, charge_name, reversed, valid
--   Never the member's name, never the arrears, never any other payment
--   or obligation. A tampered paper receipt fails because the QR points
--   back to the real record — but the real record leaks nothing beyond
--   that one payment.

-------------------------------------------------------------------------------
-- 1. Receipt number sequence
-------------------------------------------------------------------------------

CREATE SEQUENCE finance.receipt_number_seq START WITH 1 INCREMENT BY 1;
COMMENT ON SEQUENCE finance.receipt_number_seq IS
  'Monotonic sequence for the numeric tail of receipt numbers (SB-YYYY-NNNNNN). Not per-year — a global sequence is simpler and the year prefix disambiguates.';

REVOKE ALL ON SEQUENCE finance.receipt_number_seq FROM PUBLIC;
GRANT USAGE ON SEQUENCE finance.receipt_number_seq TO service_role;

-------------------------------------------------------------------------------
-- 2. Auto-generate receipt on every payment INSERT
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.generate_receipt_for_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, finance, public
AS $$
DECLARE
  v_token  TEXT;
  v_number TEXT;
BEGIN
  -- Token: 32 hex chars from a UUID. High entropy, URL-safe.
  v_token := replace(gen_random_uuid()::text, '-', '');

  -- Human-readable: SB-YYYY-NNNNNN.
  v_number := format(
    'SB-%s-%s',
    to_char(NEW.created_at, 'YYYY'),
    lpad(nextval('finance.receipt_number_seq')::text, 6, '0')
  );

  INSERT INTO finance.receipt_verifications (token, payment_id, receipt_number)
  VALUES (v_token, NEW.id, v_number);

  RETURN NULL;
END;
$$;

CREATE TRIGGER payments_generate_receipt
  AFTER INSERT ON finance.payments
  FOR EACH ROW EXECUTE FUNCTION finance.generate_receipt_for_payment();

COMMENT ON FUNCTION finance.generate_receipt_for_payment IS
  'Auto-creates the receipt_verifications row for every payment INSERT (originals + reversals). Fires alongside the M4A status trigger + the M6 ledger writer.';

-------------------------------------------------------------------------------
-- 3. Public verify function — minimal disclosure
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.verify_receipt(p_token TEXT)
RETURNS TABLE (
  valid          BOOLEAN,
  receipt_number TEXT,
  amount         NUMERIC(20, 4),
  currency       TEXT,
  paid_at        TIMESTAMPTZ,
  charge_name    TEXT,
  reversed       BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, finance, public
AS $$
DECLARE
  v_payment_id      UUID;
  v_receipt_number  TEXT;
  v_payment_amount  NUMERIC(20, 4);
  v_currency        TEXT;
  v_created_at      TIMESTAMPTZ;
  v_charge_id       UUID;
  v_reverses_id     UUID;
  v_downstream_rev  BOOLEAN;
  v_charge_name     TEXT;
BEGIN
  -- Reject empty / null tokens early with an invalid response — no
  -- error, no info leak beyond "token was invalid."
  IF p_token IS NULL OR length(p_token) < 32 THEN
    valid := FALSE;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT rv.payment_id, rv.receipt_number
    INTO v_payment_id, v_receipt_number
  FROM finance.receipt_verifications rv
  WHERE rv.token = p_token;

  IF v_payment_id IS NULL THEN
    valid := FALSE;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT p.amount, p.currency, p.created_at, p.charge_id, p.reverses_payment_id
    INTO v_payment_amount, v_currency, v_created_at, v_charge_id, v_reverses_id
  FROM finance.payments p
  WHERE p.id = v_payment_id;

  -- Should never happen (FK RESTRICT), but defense in depth.
  IF v_payment_amount IS NULL THEN
    valid := FALSE;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_charge_id IS NOT NULL THEN
    SELECT c.name INTO v_charge_name FROM finance.charges c WHERE c.id = v_charge_id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM finance.payments r WHERE r.reverses_payment_id = v_payment_id
  ) INTO v_downstream_rev;

  valid          := TRUE;
  receipt_number := v_receipt_number;
  amount         := v_payment_amount;
  currency       := v_currency;
  paid_at        := v_created_at;
  charge_name    := COALESCE(v_charge_name, '(unspecified)');
  reversed       := v_downstream_rev OR (v_reverses_id IS NOT NULL);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION finance.verify_receipt(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.verify_receipt(TEXT) TO anon, authenticated, service_role;

-- Anon needs schema USAGE to call the function. Without USAGE the
-- schema is invisible to anon and the call raises "permission denied
-- for schema finance." Granting USAGE alone does NOT let anon read any
-- finance table (RLS still applies) — it only lets anon resolve
-- functions we've explicitly EXECUTE-granted. verify_receipt is the
-- only such function.
GRANT USAGE ON SCHEMA finance TO anon;

COMMENT ON FUNCTION finance.verify_receipt IS
  'Public receipt verification. anon may EXECUTE; the SECURITY DEFINER seam bypasses RLS on receipt_verifications + payments + charges. Returns MINIMAL disclosure only (receipt_number, amount, currency, paid_at, charge_name, valid, reversed) — never the member''s name, never any other payment.';
