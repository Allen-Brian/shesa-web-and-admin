-- Migration: shared_currency_immutability_fn
--
-- Defines the trigger function that branches and (autonomous) chapters
-- will attach to enforce the **currency-immutable-once-used** rule from
-- the clusters spec:
--
--   Once ANY financial obligation, payment, contribution, or ledger row
--   references a scope, that scope's `currency_code` may no longer be
--   changed. Changing it would silently reinterpret every existing
--   monetary amount.
--
-- Why a shared function instead of a per-table trigger:
--   Branches, autonomous chapters, and (future) any other scope kind
--   that holds a treasury need the identical rule. Duplicating the body
--   invites drift; one function attached to each table stays honest.
--
-- Not attached in this migration — the branches / chapters detail-table
-- migrations attach it in the same PR that creates their tables. This
-- migration only defines the function so downstream migrations can
-- `CREATE TRIGGER ... EXECUTE FUNCTION core.enforce_currency_immutable_once_used()`
-- without redefining it.
--
-- SECURITY DEFINER:
--   The function needs to read finance tables under RLS-neutral privileges
--   because a scope admin's role might not include SELECT on the payments
--   ledger. Definer runs as the function owner (postgres), bypassing RLS.
--   `search_path` is pinned to prevent the classic definer-privilege
--   escalation via schema shadowing.
--
-- IMPORTANT ON UNKNOWN TABLES:
--   The finance tables (`finance.*`) don't exist yet in Phase 2. The
--   function checks their presence via `to_regclass` before querying —
--   so it's safe to attach now and start guarding as soon as any of
--   those tables ship. When a new finance table lands, extend the
--   `financial_tables` array in this function and no other change is
--   needed.

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
  -- (schema.table, scope-ref column). Extend as finance schemas land.
  financial_tables        TEXT[][] := ARRAY[
    ARRAY['finance.obligations',   'scope_id'],
    ARRAY['finance.payments',      'scope_id'],
    ARRAY['finance.contributions', 'scope_id'],
    ARRAY['finance.ledger_entries','scope_id']
  ];
BEGIN
  -- Nothing to enforce if currency isn't changing.
  IF NEW.currency_code IS NOT DISTINCT FROM OLD.currency_code THEN
    RETURN NEW;
  END IF;

  -- Walk every known finance table; if any references this scope, block.
  FOR i IN 1 .. array_length(financial_tables, 1)
  LOOP
    v_table := financial_tables[i][1];
    v_col   := financial_tables[i][2];

    -- Skip tables that don't exist yet — deferred to their epic.
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

REVOKE ALL ON FUNCTION core.enforce_currency_immutable_once_used() FROM PUBLIC;

COMMENT ON FUNCTION core.enforce_currency_immutable_once_used() IS
  'Shared BEFORE UPDATE trigger fn. Blocks currency_code changes when any finance table already references the scope. Attach with CREATE TRIGGER ... BEFORE UPDATE OF currency_code ON <table>. The financial_tables array inside is the source of truth for which tables gate a change — extend as finance schemas land.';
