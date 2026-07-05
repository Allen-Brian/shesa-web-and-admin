-- Migration: finance_invariant_triggers
--
-- Phase 3 M1 second migration. The immutability rules from spec Part
-- VII (payments append-only), Part VI (obligation freeze), Part IX
-- (ledger append-only), Part X (expenses append-only), and Part XII
-- (currency lock) are enforced at the database level, so no path —
-- Server Action, Edge Function, or a compromised service-role session
-- — can silently rewrite finance history.
--
-- The pattern mirrors audit.audit_entries: BEFORE triggers on the
-- protected operations that RAISE with 42501 (insufficient privilege).
-- BEFORE triggers fire for ANY caller, so this is truly database-level,
-- not RLS-level.
--
-- Complement to the RLS floor: without any UPDATE/DELETE policy on
-- these tables, RLS already denies authenticated. The triggers here
-- are the belt to that suspender — a bug in policy (or a missing
-- policy on a future admin RPC) can't bypass immutability.

-------------------------------------------------------------------------------
-- 1. Extend the shared currency lock to cover finance tables
-------------------------------------------------------------------------------
-- The helper in 20260702200400 already walks a list of finance tables
-- via `to_regclass` (skipping ones that don't exist yet). Now that our
-- tables exist, extend the list to match the real schema and attach the
-- trigger to core.scopes so any attempt to change currency_code after
-- a finance row references the scope raises 23514.

CREATE OR REPLACE FUNCTION core.enforce_currency_immutable_once_used()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, core, public
AS $$
DECLARE
  v_has_financial_history BOOLEAN := FALSE;
  v_table                 TEXT;
  v_col                   TEXT;
  v_sql                   TEXT;
  financial_tables        TEXT[][] := ARRAY[
    ARRAY['finance.charges',        'scope_id'],
    ARRAY['finance.obligations',    'scope_id'],
    ARRAY['finance.payments',       'scope_id'],
    ARRAY['finance.ledger_entries', 'scope_id'],
    ARRAY['finance.expenses',       'scope_id'],
    ARRAY['finance.treasury_balances', 'scope_id']
  ];
BEGIN
  IF NEW.currency_code IS NOT DISTINCT FROM OLD.currency_code THEN
    RETURN NEW;
  END IF;

  FOR i IN 1 .. array_length(financial_tables, 1)
  LOOP
    v_table := financial_tables[i][1];
    v_col   := financial_tables[i][2];

    CONTINUE WHEN to_regclass(v_table) IS NULL;

    v_sql := format(
      'SELECT EXISTS (SELECT 1 FROM %s WHERE %I = $1)',
      v_table, v_col
    );
    EXECUTE v_sql INTO v_has_financial_history USING NEW.scope_id;

    IF v_has_financial_history THEN
      RAISE EXCEPTION
        'currency_code is immutable once financial records exist (scope % has rows in %)',
        NEW.scope_id, v_table
        USING ERRCODE = '23514',
              HINT = 'Retire the scope and create a fresh one in the new currency instead of mutating in place.';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Attach to core.scopes. The trigger fires only when currency_code
-- itself is targeted by the UPDATE — this is enforced by the WHEN
-- clause below plus the internal short-circuit in the function.
DROP TRIGGER IF EXISTS scopes_currency_lock ON core.scopes;
CREATE TRIGGER scopes_currency_lock
  BEFORE UPDATE OF currency_code ON core.scopes
  FOR EACH ROW
  WHEN (NEW.currency_code IS DISTINCT FROM OLD.currency_code)
  EXECUTE FUNCTION core.enforce_currency_immutable_once_used();

-------------------------------------------------------------------------------
-- 2. Payments — append-only
-------------------------------------------------------------------------------
-- Same shape as audit.audit_entries_block_mutation. Corrections use a
-- new payment row with reverses_payment_id set + a reversal_reason. The
-- old row is untouched.

CREATE OR REPLACE FUNCTION finance.payments_block_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'finance.payments is append-only (% blocked)', TG_OP
    USING ERRCODE = '42501',
          HINT = 'Payments cannot be modified or deleted. Insert a reversing payment with reverses_payment_id + a reason.';
END;
$$;

CREATE TRIGGER payments_block_update
  BEFORE UPDATE ON finance.payments
  FOR EACH ROW EXECUTE FUNCTION finance.payments_block_mutation();

CREATE TRIGGER payments_block_delete
  BEFORE DELETE ON finance.payments
  FOR EACH ROW EXECUTE FUNCTION finance.payments_block_mutation();

-------------------------------------------------------------------------------
-- 3. Ledger entries — append-only
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.ledger_entries_block_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'finance.ledger_entries is append-only (% blocked)', TG_OP
    USING ERRCODE = '42501',
          HINT = 'Ledger entries cannot be modified or deleted. Write a new balancing journal instead.';
END;
$$;

CREATE TRIGGER ledger_entries_block_update
  BEFORE UPDATE ON finance.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION finance.ledger_entries_block_mutation();

CREATE TRIGGER ledger_entries_block_delete
  BEFORE DELETE ON finance.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION finance.ledger_entries_block_mutation();

-------------------------------------------------------------------------------
-- 4. Obligations — freeze immutable columns
-------------------------------------------------------------------------------
-- Frozen: amount, currency, party_type, party_id, charge_id, exception_applied,
-- prorated, period_start, period_end. These are the terms that produced
-- the obligation — a member statement must be trustworthy over time.
-- Mutable: status (open → partial/paid/cancelled/forgiven), updated_at.

CREATE OR REPLACE FUNCTION finance.obligations_enforce_freeze()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.amount             IS DISTINCT FROM OLD.amount             THEN RAISE EXCEPTION 'finance.obligations.amount is frozen'             USING ERRCODE = '42501'; END IF;
  IF NEW.currency           IS DISTINCT FROM OLD.currency           THEN RAISE EXCEPTION 'finance.obligations.currency is frozen'           USING ERRCODE = '42501'; END IF;
  IF NEW.party_type         IS DISTINCT FROM OLD.party_type         THEN RAISE EXCEPTION 'finance.obligations.party_type is frozen'         USING ERRCODE = '42501'; END IF;
  IF NEW.party_id           IS DISTINCT FROM OLD.party_id           THEN RAISE EXCEPTION 'finance.obligations.party_id is frozen'           USING ERRCODE = '42501'; END IF;
  IF NEW.charge_id          IS DISTINCT FROM OLD.charge_id          THEN RAISE EXCEPTION 'finance.obligations.charge_id is frozen'          USING ERRCODE = '42501'; END IF;
  IF NEW.exception_applied  IS DISTINCT FROM OLD.exception_applied  THEN RAISE EXCEPTION 'finance.obligations.exception_applied is frozen'  USING ERRCODE = '42501'; END IF;
  IF NEW.prorated           IS DISTINCT FROM OLD.prorated           THEN RAISE EXCEPTION 'finance.obligations.prorated is frozen'           USING ERRCODE = '42501'; END IF;
  IF NEW.period_start       IS DISTINCT FROM OLD.period_start       THEN RAISE EXCEPTION 'finance.obligations.period_start is frozen'       USING ERRCODE = '42501'; END IF;
  IF NEW.period_end         IS DISTINCT FROM OLD.period_end         THEN RAISE EXCEPTION 'finance.obligations.period_end is frozen'         USING ERRCODE = '42501'; END IF;
  IF NEW.scope_id           IS DISTINCT FROM OLD.scope_id           THEN RAISE EXCEPTION 'finance.obligations.scope_id is frozen'           USING ERRCODE = '42501'; END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER obligations_freeze
  BEFORE UPDATE ON finance.obligations
  FOR EACH ROW EXECUTE FUNCTION finance.obligations_enforce_freeze();

-- DELETE is also blocked. An obligation that "shouldn't exist" transitions
-- to status=cancelled — the row stays for audit.
CREATE OR REPLACE FUNCTION finance.obligations_block_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'finance.obligations rows are not deletable'
    USING ERRCODE = '42501',
          HINT = 'Transition status to cancelled or forgiven instead.';
END;
$$;

CREATE TRIGGER obligations_block_delete
  BEFORE DELETE ON finance.obligations
  FOR EACH ROW EXECUTE FUNCTION finance.obligations_block_delete();

-------------------------------------------------------------------------------
-- 5. Expenses — freeze money columns; block DELETE
-------------------------------------------------------------------------------
-- Frozen once recorded: amount, currency, category_id, payee, description,
-- attachment_url, incurred_at, scope_id, reverses_expense_id, reversal_reason.
-- Mutable: status (pending_approval → approved), approved_by, approved_at.
-- Corrections use a reversing expense row (reverses_expense_id).

CREATE OR REPLACE FUNCTION finance.expenses_enforce_freeze()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.amount              IS DISTINCT FROM OLD.amount              THEN RAISE EXCEPTION 'finance.expenses.amount is frozen'              USING ERRCODE = '42501'; END IF;
  IF NEW.currency            IS DISTINCT FROM OLD.currency            THEN RAISE EXCEPTION 'finance.expenses.currency is frozen'            USING ERRCODE = '42501'; END IF;
  IF NEW.category_id         IS DISTINCT FROM OLD.category_id         THEN RAISE EXCEPTION 'finance.expenses.category_id is frozen'         USING ERRCODE = '42501'; END IF;
  IF NEW.payee               IS DISTINCT FROM OLD.payee               THEN RAISE EXCEPTION 'finance.expenses.payee is frozen'               USING ERRCODE = '42501'; END IF;
  IF NEW.description         IS DISTINCT FROM OLD.description         THEN RAISE EXCEPTION 'finance.expenses.description is frozen'         USING ERRCODE = '42501'; END IF;
  IF NEW.attachment_url      IS DISTINCT FROM OLD.attachment_url      THEN RAISE EXCEPTION 'finance.expenses.attachment_url is frozen'      USING ERRCODE = '42501'; END IF;
  IF NEW.incurred_at         IS DISTINCT FROM OLD.incurred_at         THEN RAISE EXCEPTION 'finance.expenses.incurred_at is frozen'         USING ERRCODE = '42501'; END IF;
  IF NEW.scope_id            IS DISTINCT FROM OLD.scope_id            THEN RAISE EXCEPTION 'finance.expenses.scope_id is frozen'            USING ERRCODE = '42501'; END IF;
  IF NEW.reverses_expense_id IS DISTINCT FROM OLD.reverses_expense_id THEN RAISE EXCEPTION 'finance.expenses.reverses_expense_id is frozen' USING ERRCODE = '42501'; END IF;
  IF NEW.reversal_reason     IS DISTINCT FROM OLD.reversal_reason     THEN RAISE EXCEPTION 'finance.expenses.reversal_reason is frozen'     USING ERRCODE = '42501'; END IF;

  -- Once approved, further UPDATEs are entirely disallowed.
  IF OLD.status = 'approved' THEN
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.approved_by IS DISTINCT FROM OLD.approved_by OR NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
      RAISE EXCEPTION 'finance.expenses row is frozen once status=approved'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER expenses_freeze
  BEFORE UPDATE ON finance.expenses
  FOR EACH ROW EXECUTE FUNCTION finance.expenses_enforce_freeze();

CREATE OR REPLACE FUNCTION finance.expenses_block_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'finance.expenses rows are not deletable'
    USING ERRCODE = '42501',
          HINT = 'Insert a reversing expense with reverses_expense_id + a reason.';
END;
$$;

CREATE TRIGGER expenses_block_delete
  BEFORE DELETE ON finance.expenses
  FOR EACH ROW EXECUTE FUNCTION finance.expenses_block_delete();

-------------------------------------------------------------------------------
-- 6. Treasury balances — restrict to the ledger path
-------------------------------------------------------------------------------
-- Balance is maintained by the ledger-writing transaction (M6). Direct
-- writes are forbidden — otherwise a scope could edit its balance without
-- a matching ledger entry, breaking the "ledger is the source of truth"
-- invariant.
--
-- Enforcement: block UPDATE via trigger UNLESS the caller sets
-- current_setting('finance.writing_ledger', true) = 'on' — the ledger
-- path (M6) will set that GUC inside its SECURITY DEFINER RPC. This is
-- the same "trusted-caller GUC" pattern used elsewhere in the codebase
-- when a table has a single write path.

CREATE OR REPLACE FUNCTION finance.treasury_balances_enforce_ledger_path()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(current_setting('finance.writing_ledger', true), '') <> 'on' THEN
    RAISE EXCEPTION 'finance.treasury_balances is maintained by the ledger-writing path only (% blocked)', TG_OP
      USING ERRCODE = '42501',
            HINT = 'Write via the ledger RPC (finance.write_journal, arriving with M6). Do not UPDATE this table directly.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER treasury_balances_ledger_path_only_update
  BEFORE UPDATE ON finance.treasury_balances
  FOR EACH ROW EXECUTE FUNCTION finance.treasury_balances_enforce_ledger_path();

CREATE TRIGGER treasury_balances_ledger_path_only_delete
  BEFORE DELETE ON finance.treasury_balances
  FOR EACH ROW EXECUTE FUNCTION finance.treasury_balances_enforce_ledger_path();

-- INSERTs stay unrestricted — a scope's initial 0-balance row is written
-- when the scope becomes finance-bearing (M6). This is a placeholder;
-- the ledger path lands with M6.
