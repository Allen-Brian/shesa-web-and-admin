-- Migration: finance_hardening
--
-- Phase 3 M12 — the hardening pass. Two items:
--
--   1. Public donation was writing the payment but not calling
--      audit.log_event. Fill the gap so every money movement leaves
--      an audit row, regardless of the entry point.
--
--   2. Nothing else structural — the reversal flows, freeze triggers,
--      RLS floor, and immutable ledger have full pgTAP coverage across
--      e3_1 through e3_12. The comprehensive end-to-end integration
--      test lands as e3_13 (a separate test file, not a migration).

-------------------------------------------------------------------------------
-- 1. record_public_donation — add audit
-------------------------------------------------------------------------------
-- audit.log_event captures auth.uid() which is NULL under anon. That's
-- the correct behavior — the row records a system-actor event that
-- carries the donor_email in metadata as the closest thing we have to
-- a party identifier.

CREATE OR REPLACE FUNCTION finance.record_public_donation(
  p_charge_id    UUID,
  p_amount       NUMERIC,
  p_currency     TEXT,
  p_method       finance.payment_method,
  p_donor_name   TEXT DEFAULT NULL,
  p_donor_email  TEXT DEFAULT NULL,
  p_note         TEXT DEFAULT NULL
)
RETURNS TABLE (
  payment_id     UUID,
  receipt_token  TEXT,
  receipt_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, finance, public
AS $$
DECLARE
  v_charge     finance.charges%ROWTYPE;
  v_payment_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive' USING ERRCODE = '22023';
  END IF;
  IF p_currency IS NULL OR length(p_currency) <> 3 THEN
    RAISE EXCEPTION 'currency must be ISO 4217' USING ERRCODE = '22023';
  END IF;
  IF p_donor_name IS NOT NULL AND length(p_donor_name) > 200 THEN
    RAISE EXCEPTION 'donor_name too long' USING ERRCODE = '22023';
  END IF;
  IF p_donor_email IS NOT NULL AND length(p_donor_email) > 320 THEN
    RAISE EXCEPTION 'donor_email too long' USING ERRCODE = '22023';
  END IF;
  IF p_note IS NOT NULL AND length(p_note) > 500 THEN
    RAISE EXCEPTION 'note too long' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_charge FROM finance.charges WHERE id = p_charge_id;

  IF NOT FOUND
     OR v_charge.shape <> 'donation'
     OR v_charge.status <> 'active'
     OR v_charge.lifecycle <> 'open'
     OR v_charge.currency <> upper(p_currency)
  THEN
    RAISE EXCEPTION 'this campaign is not accepting donations'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO finance.payments
    (obligation_id, charge_id, scope_id, payer_member_id,
     amount, currency, method, source, recorded_by,
     metadata)
  VALUES
    (NULL, v_charge.id, v_charge.scope_id, NULL,
     p_amount, upper(p_currency), p_method, 'auto', NULL,
     jsonb_build_object(
       'public_donation', TRUE,
       'donor_name', p_donor_name,
       'donor_email', p_donor_email,
       'note', p_note
     ))
  RETURNING id INTO v_payment_id;

  -- Fill the M12 audit gap. Actor is NULL under anon — that's fine;
  -- the metadata carries the donor_email + charge details for
  -- reconciliation.
  PERFORM audit.log_event(
    'donation.recorded',
    'finance', 'payments', v_payment_id,
    v_charge.scope_id,
    jsonb_build_object(
      'chargeId', v_charge.id,
      'chargeName', v_charge.name,
      'amount', p_amount,
      'currency', upper(p_currency),
      'method', p_method,
      'donorName', p_donor_name,
      'donorEmail', p_donor_email,
      'public', TRUE
    )
  );

  RETURN QUERY
  SELECT
    v_payment_id,
    rv.token,
    rv.receipt_number
  FROM finance.receipt_verifications rv
  WHERE rv.payment_id = v_payment_id;
END;
$$;

-- The existing GRANT + REVOKE from 20260706101300 stays valid;
-- CREATE OR REPLACE keeps the ACLs intact.
