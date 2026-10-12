-- Migration: finance_obligation_status_from_payments
--
-- Phase 3 M4 — the missing link between payments and obligations.
--
-- Spec Part VI: "Partial payments allowed; the unpaid remainder shows
-- as arrears." An obligation's status is derived from the sum of
-- non-reversed payments applied against it:
--
--   sum(non-reversed payments) == 0            → status stays 'open'
--   0 < sum(non-reversed payments) < amount    → status = 'partial'
--   sum(non-reversed payments) >= amount       → status = 'paid'
--
-- Reversals (cancel + forgive) transition status via other paths:
--   * cancel: charges/cancel-obligation (M4+) sets status = 'cancelled'
--   * forgive: obligations/forgive (M8 sensitive tier) sets 'forgiven'
-- Neither of those touches the payment sum — they're independent
-- transitions and are guarded against being overwritten by this
-- trigger's derived-status logic below.
--
-- The trigger fires:
--   AFTER INSERT ON finance.payments (append-only, no UPDATE/DELETE).
-- Both original payments AND their reversals fire the trigger — a
-- reversal reduces the sum by the amount of the payment it reverses.
-- We recompute from scratch each fire; it's cheap (payments per
-- obligation is small).
--
-- Interaction with the M1 obligation freeze trigger:
--   The freeze trigger blocks changes to amount/party/etc. STATUS is
--   NOT frozen (documented in the M1 trigger's rationale). This trigger
--   updates status only; the freeze passes.

CREATE OR REPLACE FUNCTION finance.obligations_recompute_status_from_payments()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_obligation_id UUID;
  v_amount        NUMERIC(20, 4);
  v_paid          NUMERIC(20, 4);
  v_current_status finance.obligation_status;
BEGIN
  v_obligation_id := NEW.obligation_id;

  IF v_obligation_id IS NULL THEN
    RETURN NULL;   -- payment against a contribution shape, no obligation
  END IF;

  SELECT amount, status
    INTO v_amount, v_current_status
  FROM finance.obligations
  WHERE id = v_obligation_id;

  IF NOT FOUND THEN
    RETURN NULL;   -- shouldn't happen; obligation_id is FK'd
  END IF;

  -- Terminal statuses cancel + forgive stay put — they were set by
  -- independent paths and should not be silently overwritten by
  -- a late payment landing on the row.
  IF v_current_status IN ('cancelled', 'forgiven') THEN
    RETURN NULL;
  END IF;

  -- Sum of non-reversed payments on this obligation.
  --   A payment counts if it's NOT itself a reversal (reverses_payment_id
  --   IS NULL) AND no downstream payment reverses it.
  SELECT COALESCE(SUM(p.amount), 0)
    INTO v_paid
  FROM finance.payments p
  WHERE p.obligation_id = v_obligation_id
    AND p.reverses_payment_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM finance.payments r
      WHERE r.reverses_payment_id = p.id
    );

  -- Derive the target status.
  IF v_paid <= 0 THEN
    UPDATE finance.obligations SET status = 'open' WHERE id = v_obligation_id AND status <> 'open';
  ELSIF v_paid < v_amount THEN
    UPDATE finance.obligations SET status = 'partial' WHERE id = v_obligation_id AND status <> 'partial';
  ELSE
    UPDATE finance.obligations SET status = 'paid' WHERE id = v_obligation_id AND status <> 'paid';
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER payments_recompute_obligation_status
  AFTER INSERT ON finance.payments
  FOR EACH ROW EXECUTE FUNCTION finance.obligations_recompute_status_from_payments();

COMMENT ON FUNCTION finance.obligations_recompute_status_from_payments IS
  'Derives obligation.status from the sum of non-reversed payments after a payment INSERT. Terminal transitions (cancelled / forgiven) are preserved — this trigger only moves open <-> partial <-> paid. Reversal INSERTs reduce the paid sum via the not-exists subquery.';
