-- Migration: finance_expense_ledger
--
-- Phase 3 M7 — the expense side of the ledger writer. Symmetrical to
-- M6's write_ledger_from_payment, with two additional wrinkles:
--
--   1. Expenses can enter as status='pending_approval' — no ledger
--      write happens until the Admin approves the row. Only 'recorded'
--      and 'approved' expenses hit the ledger.
--   2. The writer must handle BOTH the INSERT (for below-threshold
--      records that skip approval) AND the UPDATE that flips
--      pending_approval -> approved.
--
-- Direction rules (spec Part IX):
--   * Non-reversal expense (reverses_expense_id IS NULL) → 'expense'.
--     Money leaves the treasury.
--   * Reversal expense (reverses_expense_id IS NOT NULL) → 'income'.
--     Money "returns" — the earlier outflow is cancelled out.
--
-- The M1 immutability triggers still hold: expenses freeze on the money
-- columns; ledger stays append-only; treasury_balances updates require
-- the finance.writing_ledger GUC. The writer flips the GUC just long
-- enough, exactly like the payment path.
--
-- What this migration does NOT do:
--   * expense.record / expense.approve / expense.reverse edge functions —
--     they live under supabase/functions/expenses/ (this same PR).
--   * expense_settings/set endpoint — deferred (admin can set the
--     threshold directly via a service-role RPC for now).

-------------------------------------------------------------------------------
-- 1. write_ledger_from_expense
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.write_ledger_from_expense(p_expense_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, core, finance, public
AS $$
DECLARE
  v_expense       finance.expenses%ROWTYPE;
  v_direction     finance.ledger_direction;
  v_journal_id    UUID;
  v_scope_currency TEXT;
  v_memo          TEXT;
BEGIN
  SELECT * INTO v_expense FROM finance.expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'write_ledger_from_expense: expense % not found', p_expense_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_expense.reverses_expense_id IS NULL THEN
    v_direction := 'expense';
    v_memo := format('expense %s', v_expense.id);
  ELSE
    v_direction := 'income';
    v_memo := format('reversal of expense %s', v_expense.reverses_expense_id);
  END IF;

  v_journal_id := gen_random_uuid();

  INSERT INTO finance.ledger_entries
    (journal_id, scope_id, direction, amount, currency, expense_id, memo)
  VALUES
    (v_journal_id, v_expense.scope_id, v_direction, v_expense.amount,
     v_expense.currency, v_expense.id, v_memo);

  SELECT currency_code INTO v_scope_currency FROM core.scopes WHERE id = v_expense.scope_id;
  INSERT INTO finance.treasury_balances (scope_id, balance, currency)
  VALUES (v_expense.scope_id, 0, COALESCE(v_scope_currency, v_expense.currency))
  ON CONFLICT (scope_id) DO NOTHING;

  PERFORM set_config('finance.writing_ledger', 'on', true);

  IF v_direction = 'expense' THEN
    UPDATE finance.treasury_balances
       SET balance = balance - v_expense.amount,
           updated_at = NOW()
     WHERE scope_id = v_expense.scope_id;
  ELSE
    UPDATE finance.treasury_balances
       SET balance = balance + v_expense.amount,
           updated_at = NOW()
     WHERE scope_id = v_expense.scope_id;
  END IF;

  PERFORM set_config('finance.writing_ledger', 'off', true);

  RETURN v_journal_id;
END;
$$;

REVOKE ALL ON FUNCTION finance.write_ledger_from_expense(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.write_ledger_from_expense(UUID) TO service_role;

COMMENT ON FUNCTION finance.write_ledger_from_expense IS
  'Writes a ledger entry + updates the treasury balance for an expense. Direction: expense for records, income for reversals. Guarded by the finance.writing_ledger GUC. Called by expenses INSERT/UPDATE triggers.';

-------------------------------------------------------------------------------
-- 2. INSERT trigger — write ledger for expenses that enter as 'recorded' or 'approved'
-------------------------------------------------------------------------------
-- Below-threshold record: INSERTs with status='recorded' → write ledger now.
-- Above-threshold record: INSERTs with status='pending_approval' → wait.
-- Reversal expenses INSERT with status='recorded' (they never need approval).
-- If the Admin admin inserts a row already in 'approved' state
-- (shouldn't happen through the edge fn but defensive), also write.

CREATE OR REPLACE FUNCTION finance.expenses_write_ledger_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('recorded', 'approved') THEN
    PERFORM finance.write_ledger_from_expense(NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER expenses_write_ledger_on_insert
  AFTER INSERT ON finance.expenses
  FOR EACH ROW EXECUTE FUNCTION finance.expenses_write_ledger_on_insert();

-------------------------------------------------------------------------------
-- 3. UPDATE trigger — write ledger on approval
-------------------------------------------------------------------------------
-- The M1 freeze trigger allows only the pending_approval → approved
-- transition (plus approved_by + approved_at bookkeeping). Once
-- OLD.status='pending_approval' AND NEW.status='approved', the money
-- should hit the ledger.

CREATE OR REPLACE FUNCTION finance.expenses_write_ledger_on_approve()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'pending_approval' AND NEW.status = 'approved' THEN
    PERFORM finance.write_ledger_from_expense(NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER expenses_write_ledger_on_approve
  AFTER UPDATE ON finance.expenses
  FOR EACH ROW
  WHEN (OLD.status = 'pending_approval' AND NEW.status = 'approved')
  EXECUTE FUNCTION finance.expenses_write_ledger_on_approve();
