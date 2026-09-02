-- Migration: fix_currency_lock_scopes_attachment
--
-- Follow-up to 20260706100100. The shared currency-lock function was
-- authored on the assumption it would attach to a detail table
-- (core.branches / core.chapters) whose rows carry a `scope_id` column.
-- The previous migration attaches it to `core.scopes` directly — because
-- `currency_code` actually lives on scopes, not the details — but the
-- function still dereferences `NEW.scope_id`, which raises 42703 (undefined
-- column) when the trigger fires on a core.scopes UPDATE.
--
-- This migration teaches the function to distinguish attachment paths:
--   * on core.scopes    → look up NEW.id
--   * on a detail table → look up NEW.scope_id (the original design)
-- The `TG_TABLE_SCHEMA` + `TG_TABLE_NAME` GUCs are the source of truth.
-- Both paths stay supported so future detail-table attachments (rate
-- caps, treasury-owning entities we haven't invented yet) still work.

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
  v_scope_id              UUID;
  financial_tables        TEXT[][] := ARRAY[
    ARRAY['finance.charges',           'scope_id'],
    ARRAY['finance.obligations',       'scope_id'],
    ARRAY['finance.payments',          'scope_id'],
    ARRAY['finance.ledger_entries',    'scope_id'],
    ARRAY['finance.expenses',          'scope_id'],
    ARRAY['finance.treasury_balances', 'scope_id']
  ];
BEGIN
  IF NEW.currency_code IS NOT DISTINCT FROM OLD.currency_code THEN
    RETURN NEW;
  END IF;

  -- Which UUID to check against the finance tables depends on which
  -- table the trigger is attached to.
  IF TG_TABLE_SCHEMA = 'core' AND TG_TABLE_NAME = 'scopes' THEN
    v_scope_id := NEW.id;
  ELSE
    v_scope_id := NEW.scope_id;
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
    EXECUTE v_sql INTO v_has_financial_history USING v_scope_id;

    IF v_has_financial_history THEN
      RAISE EXCEPTION
        'currency_code is immutable once financial records exist (scope % has rows in %)',
        v_scope_id, v_table
        USING ERRCODE = '23514',
              HINT = 'Retire the scope and create a fresh one in the new currency instead of mutating in place.';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;
