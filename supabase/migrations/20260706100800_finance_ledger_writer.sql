-- Migration: finance_ledger_writer
--
-- Phase 3 M6 — the double-entry engine. Spec Part IX:
--
--   Every payment writes a balancing journal of ledger lines.
--   Journals always balance; a correction is a new balancing journal.
--   Treasury balances are maintained by the ledger-writing path only.
--
-- Three pieces land together:
--
--   1. finance.write_ledger_from_payment(payment_id) — the writer. Reads
--      the payment row, INSERTs the matching ledger_entries row, ensures
--      the treasury_balances row exists, and UPDATEs the balance via the
--      finance.writing_ledger GUC gate from M1. All in one transaction.
--
--   2. finance.payments_write_ledger AFTER INSERT trigger — fires the
--      writer for every new payment row (both originals and reversals).
--
--   3. finance.get_treasury_statement(scope_id, from, to) — the read
--      side. Returns opening / income / expense / closing per spec
--      Part XIII "Treasury statement" report. Permission-gated on
--      treasury.read.
--
-- Direction rules (spec Part VII + IX):
--   * Original payment (reverses_payment_id IS NULL) → direction='income'.
--     Money arrives at the scope's treasury.
--   * Reversal payment (reverses_payment_id IS NOT NULL) → direction='expense'.
--     Money leaves — the earlier income is cancelled out.
--
-- The M1 immutability triggers still hold: ledger_entries stays
-- append-only (UPDATE/DELETE both blocked); treasury_balances rejects
-- direct UPDATEs without the finance.writing_ledger GUC. The writer
-- flips the GUC just long enough to update the balance, then the
-- guard reasserts.
--
-- What this migration does NOT do:
--   * Expenses (M7) — the expense engine will have its own writer that
--     shares the finance.writing_ledger gate + INSERTs an 'expense'
--     ledger row and decrements the balance.
--   * Multi-line balancing journals for cross-scope transfers (not in
--     spec's M6 scope; a follow-up when a real cross-scope transfer
--     use case lands).

-------------------------------------------------------------------------------
-- 1. write_ledger_from_payment
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.write_ledger_from_payment(p_payment_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, core, finance, public
AS $$
DECLARE
  v_payment       finance.payments%ROWTYPE;
  v_direction     finance.ledger_direction;
  v_journal_id    UUID;
  v_scope_currency TEXT;
  v_memo          TEXT;
BEGIN
  SELECT * INTO v_payment FROM finance.payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'write_ledger_from_payment: payment % not found', p_payment_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Direction: reversals leave the treasury; originals arrive.
  IF v_payment.reverses_payment_id IS NULL THEN
    v_direction := 'income';
    v_memo := format('payment %s', v_payment.id);
  ELSE
    v_direction := 'expense';
    v_memo := format('reversal of payment %s', v_payment.reverses_payment_id);
  END IF;

  -- One journal per write. Multi-line balancing journals (e.g. future
  -- cross-scope transfers) would share a journal_id across INSERTs.
  v_journal_id := gen_random_uuid();

  -- INSERT the ledger row. The M1 ledger append-only trigger permits
  -- INSERT; UPDATE + DELETE stay blocked.
  INSERT INTO finance.ledger_entries
    (journal_id, scope_id, direction, amount, currency, payment_id, memo)
  VALUES
    (v_journal_id, v_payment.scope_id, v_direction, v_payment.amount,
     v_payment.currency, v_payment.id, v_memo);

  -- Ensure the balance row exists. INSERT on treasury_balances is
  -- unrestricted; UPDATE needs the finance.writing_ledger GUC.
  SELECT currency_code INTO v_scope_currency FROM core.scopes WHERE id = v_payment.scope_id;
  INSERT INTO finance.treasury_balances (scope_id, balance, currency)
  VALUES (v_payment.scope_id, 0, COALESCE(v_scope_currency, v_payment.currency))
  ON CONFLICT (scope_id) DO NOTHING;

  -- Flip the M1 GUC gate + UPDATE the balance. `is_local := true` keeps
  -- the setting scoped to the current transaction — it evaporates on
  -- COMMIT / ROLLBACK, so a concurrent session never inherits it.
  PERFORM set_config('finance.writing_ledger', 'on', true);

  IF v_direction = 'income' THEN
    UPDATE finance.treasury_balances
       SET balance = balance + v_payment.amount,
           updated_at = NOW()
     WHERE scope_id = v_payment.scope_id;
  ELSE
    UPDATE finance.treasury_balances
       SET balance = balance - v_payment.amount,
           updated_at = NOW()
     WHERE scope_id = v_payment.scope_id;
  END IF;

  -- Reassert the guard for defense in depth. Not strictly needed since
  -- the LOCAL scope lifts the GUC at end-of-transaction, but any
  -- subsequent write inside this same transaction that tries to touch
  -- treasury_balances outside this writer should fail.
  PERFORM set_config('finance.writing_ledger', 'off', true);

  RETURN v_journal_id;
END;
$$;

REVOKE ALL ON FUNCTION finance.write_ledger_from_payment(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.write_ledger_from_payment(UUID) TO service_role;

COMMENT ON FUNCTION finance.write_ledger_from_payment IS
  'Writes a ledger entry + updates the treasury balance for a payment. Direction: income for originals, expense for reversals. Guarded by the finance.writing_ledger GUC that M1 requires for treasury_balances updates. Called by the payments AFTER INSERT trigger.';

-------------------------------------------------------------------------------
-- 2. Trigger — every payment INSERT lands in the ledger + balance
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.payments_write_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM finance.write_ledger_from_payment(NEW.id);
  RETURN NULL;
END;
$$;

-- Fires after M4A's recompute trigger (alphabetical: recompute < write).
-- Order doesn't affect correctness — they touch different tables — but
-- the natural read is "money arrived, then obligation reflected it,"
-- which the ordering matches once we look at trigger names in reverse.
CREATE TRIGGER payments_write_ledger
  AFTER INSERT ON finance.payments
  FOR EACH ROW EXECUTE FUNCTION finance.payments_write_ledger();

COMMENT ON FUNCTION finance.payments_write_ledger IS
  'Fires finance.write_ledger_from_payment for every payment INSERT so the ledger + treasury stay in sync without an app-layer step.';

-------------------------------------------------------------------------------
-- 3. get_treasury_statement — the read side
-------------------------------------------------------------------------------
-- Spec Part XIII: opening · income · expenses · closing. Permission-gated
-- on treasury.read at the target scope. Any window supported:
--   p_from IS NULL → opening=0, income+expense from start of time.
--   p_from set     → opening = balance from ledger before p_from.

CREATE OR REPLACE FUNCTION finance.get_treasury_statement(
  p_scope_id UUID,
  p_from     TIMESTAMPTZ DEFAULT NULL,
  p_to       TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  scope_id         UUID,
  currency         TEXT,
  opening_balance  NUMERIC(20, 4),
  income_sum       NUMERIC(20, 4),
  expense_sum      NUMERIC(20, 4),
  closing_balance  NUMERIC(20, 4)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, core, finance, public
AS $$
DECLARE
  v_currency TEXT;
  v_opening  NUMERIC(20, 4);
  v_income   NUMERIC(20, 4);
  v_expense  NUMERIC(20, 4);
BEGIN
  IF NOT (core.has_permission(auth.uid(), p_scope_id, 'treasury.read')
          OR core.has_permission(auth.uid(), p_scope_id, 'finance.read')) THEN
    RAISE EXCEPTION 'treasury.read at scope % denied', p_scope_id
      USING ERRCODE = '42501';
  END IF;

  SELECT s.currency_code INTO v_currency FROM core.scopes s WHERE s.id = p_scope_id;

  IF p_from IS NULL THEN
    v_opening := 0;
  ELSE
    SELECT COALESCE(SUM(CASE le.direction
                          WHEN 'income' THEN le.amount
                          ELSE -le.amount END), 0)
      INTO v_opening
    FROM finance.ledger_entries le
    WHERE le.scope_id = p_scope_id
      AND le.created_at < p_from;
  END IF;

  SELECT
    COALESCE(SUM(CASE le.direction WHEN 'income'  THEN le.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE le.direction WHEN 'expense' THEN le.amount ELSE 0 END), 0)
  INTO v_income, v_expense
  FROM finance.ledger_entries le
  WHERE le.scope_id = p_scope_id
    AND (p_from IS NULL OR le.created_at >= p_from)
    AND le.created_at <= p_to;

  scope_id         := p_scope_id;
  currency         := v_currency;
  opening_balance  := v_opening;
  income_sum       := v_income;
  expense_sum      := v_expense;
  closing_balance  := v_opening + v_income - v_expense;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION finance.get_treasury_statement(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.get_treasury_statement(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;

COMMENT ON FUNCTION finance.get_treasury_statement IS
  'Treasury statement per spec Part XIII: opening + income + expenses + closing. Auth-gated on treasury.read at the target scope.';
