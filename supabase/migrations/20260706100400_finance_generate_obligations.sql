-- Migration: finance_generate_obligations
--
-- Phase 3 M2B — the obligation-generation workhorse. Spec Parts III + VI.
--
-- Two functions:
--   1. finance.compute_period(recurrence, interval, reference) —
--      pure period-boundary math; mirrors packages/domain/src/finance/
--      periods.ts. Returns (period_start, period_end) as DATEs.
--   2. finance.generate_obligations_for_charge(charge_id, reference) —
--      the writer. Reads the charge, computes the current period, walks
--      members with an active/passive membership at the charge's scope,
--      computes prorated amounts, and INSERTs obligations. Idempotent
--      via the UNIQUE(charge_id, party_type, party_id, period_start)
--      constraint from the M1 schema.
--
-- What M2B v1 handles:
--   * shape='charge' or 'fixed' — the obligation-creating shapes.
--   * recurrence='monthly' | 'quarterly' | 'biannual' | 'yearly' with
--     any interval >= 1, plus 'one_time'.
--   * target_party_type='member' (or NULL — defaults to member).
--   * Proration by days for mid-period joiners.
--   * All members with membership_status IN ('active', 'passive') at
--     the charge's scope are targets.
--
-- What M2B DOES NOT handle (deferred to later milestones):
--   * target_party_type='branch' (Global levies on branches) — M3.
--   * target_filter narrowing (batch / house / network / exit-year
--     restrictions) — M8 alongside the audience resolver reuse.
--   * Exception resolution (individual / attribute / group / base
--     priority walk) — M8. Obligations here get exception_applied=NULL.
--   * Cross-currency amounts — snapshot rates land with the payment
--     engine in M4.

-------------------------------------------------------------------------------
-- 1. finance.compute_period — period-boundary helper
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.compute_period(
  p_recurrence finance.charge_recurrence,
  p_interval   INTEGER,
  p_reference  TIMESTAMPTZ
)
RETURNS TABLE(period_start DATE, period_end DATE)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_year        INT := EXTRACT(YEAR FROM p_reference)::int;
  v_month_1b    INT := EXTRACT(MONTH FROM p_reference)::int;   -- 1-12
  v_month_0b    INT := v_month_1b - 1;                          -- 0-11
  v_quarter     INT;
  v_half        INT;
  v_anchored    INT;
BEGIN
  IF p_interval < 1 THEN
    RAISE EXCEPTION 'compute_period: interval must be >= 1 (got %)', p_interval
      USING ERRCODE = '22023';
  END IF;

  IF p_recurrence = 'one_time' THEN
    RAISE EXCEPTION 'compute_period: one_time has no recurring period'
      USING ERRCODE = '22023';
  END IF;

  CASE p_recurrence
    WHEN 'monthly' THEN
      v_anchored := (v_month_0b / p_interval) * p_interval;    -- 0-based
      period_start := make_date(v_year, v_anchored + 1, 1);
      period_end   := (period_start + (p_interval || ' months')::interval)::date;

    WHEN 'quarterly' THEN
      v_quarter := v_month_0b / 3;                              -- 0..3
      v_anchored := (v_quarter / p_interval) * p_interval;
      period_start := make_date(v_year, v_anchored * 3 + 1, 1);
      period_end   := (period_start + (p_interval * 3 || ' months')::interval)::date;

    WHEN 'biannual' THEN
      v_half := CASE WHEN v_month_0b < 6 THEN 0 ELSE 1 END;
      v_anchored := (v_half / p_interval) * p_interval;
      period_start := make_date(v_year, v_anchored * 6 + 1, 1);
      period_end   := (period_start + (p_interval * 6 || ' months')::interval)::date;

    WHEN 'yearly' THEN
      v_anchored := (v_year / p_interval) * p_interval;
      period_start := make_date(v_anchored, 1, 1);
      period_end   := (period_start + (p_interval || ' years')::interval)::date;

    ELSE
      RAISE EXCEPTION 'compute_period: unknown recurrence %', p_recurrence;
  END CASE;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION finance.compute_period(finance.charge_recurrence, INTEGER, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.compute_period(finance.charge_recurrence, INTEGER, TIMESTAMPTZ)
  TO authenticated, service_role;

COMMENT ON FUNCTION finance.compute_period IS
  'Pure period-boundary math for a recurring charge. Returns (start, end) as DATEs; end is exclusive. Mirrors packages/domain/src/finance/periods.ts.';

-------------------------------------------------------------------------------
-- 2. finance.generate_obligations_for_charge — the writer
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.generate_obligations_for_charge(
  p_charge_id  UUID,
  p_reference  TIMESTAMPTZ DEFAULT NOW()
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, core, finance, public
AS $$
DECLARE
  v_charge          finance.charges%ROWTYPE;
  v_period_start    DATE;
  v_period_end      DATE;
  v_inserted        INTEGER := 0;
  v_member_id       UUID;
  v_joined_at       TIMESTAMPTZ;
  v_amount          NUMERIC(20, 4);
  v_days_in_period  INTEGER;
  v_days_owed       INTEGER;
BEGIN
  SELECT * INTO v_charge FROM finance.charges WHERE id = p_charge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'charge not found: %', p_charge_id USING ERRCODE = 'P0002';
  END IF;

  -- Only active charges generate.
  IF v_charge.status <> 'active' THEN
    RETURN 0;
  END IF;

  -- Only obligation-creating shapes.
  IF v_charge.shape NOT IN ('charge', 'fixed') THEN
    RETURN 0;
  END IF;

  -- Only member-targeted charges in M2B v1.
  IF v_charge.target_party_type = 'branch' THEN
    RAISE NOTICE 'generate_obligations_for_charge: branch-as-body targeting deferred to M3 (charge %)', p_charge_id;
    RETURN 0;
  END IF;

  -- Compute the current period.
  IF v_charge.shape = 'fixed' OR v_charge.recurrence = 'one_time' THEN
    v_period_start := COALESCE(
      v_charge.activation_date::date,
      v_charge.open_date::date,
      p_reference::date
    );
    v_period_end := v_period_start + INTERVAL '1 day';
  ELSE
    SELECT p.period_start, p.period_end
      INTO v_period_start, v_period_end
      FROM finance.compute_period(v_charge.recurrence, v_charge.recurrence_interval, p_reference) p;
  END IF;

  -- Do not generate before the charge is scheduled to become payable.
  -- activation_date is the "arrears begin" instant per spec Part III.
  IF v_charge.activation_date IS NOT NULL AND v_charge.activation_date > p_reference THEN
    RETURN 0;
  END IF;

  v_days_in_period := (v_period_end - v_period_start);
  IF v_days_in_period <= 0 THEN
    v_days_in_period := 1;  -- one_time case
  END IF;

  -- Walk members with membership at the charge's scope.
  FOR v_member_id, v_joined_at IN
    SELECT m.member_id, m.joined_at
      FROM core.memberships m
     WHERE m.scope_id = v_charge.scope_id
       AND m.membership_status IN ('active', 'passive')
  LOOP
    -- Skip members who joined after the period ends.
    IF v_joined_at >= v_period_end THEN
      CONTINUE;
    END IF;

    -- Compute amount (proration).
    IF v_joined_at <= v_period_start OR v_charge.base_amount IS NULL THEN
      v_amount := COALESCE(v_charge.base_amount, 0);
    ELSE
      v_days_owed := (v_period_end - v_joined_at::date);
      IF v_days_owed >= v_days_in_period THEN
        v_amount := v_charge.base_amount;
      ELSIF v_days_owed <= 0 THEN
        CONTINUE;  -- entire period was pre-join
      ELSE
        v_amount := ROUND(v_charge.base_amount * v_days_owed::numeric / v_days_in_period::numeric, 2);
      END IF;
    END IF;

    -- Idempotent INSERT via the M1 UNIQUE constraint.
    BEGIN
      INSERT INTO finance.obligations
        (charge_id, scope_id, party_type, party_id, amount, currency, status,
         prorated, period_start, period_end)
      VALUES
        (v_charge.id, v_charge.scope_id, 'member', v_member_id, v_amount,
         v_charge.currency, 'open',
         (v_amount < v_charge.base_amount),
         v_period_start, v_period_end);
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Already generated for this (charge, member, period). No-op.
      CONTINUE;
    END;
  END LOOP;

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION finance.generate_obligations_for_charge(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.generate_obligations_for_charge(UUID, TIMESTAMPTZ)
  TO service_role;   -- Called by pg_cron (postgres role) + Edge Function (service_role). Authenticated users go through the edge fn's auth check.

COMMENT ON FUNCTION finance.generate_obligations_for_charge IS
  'Generates obligations for a single active charge as of p_reference. Idempotent via the (charge_id, party_type, party_id, period_start) UNIQUE constraint. Returns count inserted. M2B v1: member-targeted only; branch-as-body targeting deferred to M3.';

-------------------------------------------------------------------------------
-- 3. finance.generate_obligations_sweep — pg_cron entry point
-------------------------------------------------------------------------------
-- Walks every active recurring charge whose activation_date has passed
-- and calls generate_obligations_for_charge on each. Returns the total
-- inserted across all charges. Cheap enough to run hourly — most charges
-- are once-a-month so most calls are no-ops via the UNIQUE constraint.

CREATE OR REPLACE FUNCTION finance.generate_obligations_sweep(
  p_reference TIMESTAMPTZ DEFAULT NOW()
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, core, finance, public
AS $$
DECLARE
  v_total INTEGER := 0;
  v_charge_id UUID;
  v_inserted INTEGER;
BEGIN
  FOR v_charge_id IN
    SELECT id FROM finance.charges
     WHERE status = 'active'
       AND shape IN ('charge', 'fixed')
       AND (activation_date IS NULL OR activation_date <= p_reference)
  LOOP
    v_inserted := finance.generate_obligations_for_charge(v_charge_id, p_reference);
    v_total := v_total + v_inserted;
  END LOOP;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION finance.generate_obligations_sweep(TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.generate_obligations_sweep(TIMESTAMPTZ)
  TO service_role;

COMMENT ON FUNCTION finance.generate_obligations_sweep IS
  'Fires generate_obligations_for_charge over every active recurring charge. Scheduled hourly via pg_cron (see the pg_cron schedule migration). Returns total obligations inserted.';

-------------------------------------------------------------------------------
-- 4. pg_cron schedule — hourly sweep
-------------------------------------------------------------------------------
-- Runs at :00 every hour. Each charge only generates one obligation per
-- period per party — repeated runs within a period are silent no-ops via
-- the UNIQUE constraint.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron extension not installed; skipping schedule. Install pg_cron then rerun this migration.';
    RETURN;
  END IF;

  -- Idempotent: unschedule any existing job with the same name.
  PERFORM cron.unschedule('finance-generate-obligations-hourly')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'finance-generate-obligations-hourly');

  PERFORM cron.schedule(
    'finance-generate-obligations-hourly',
    '0 * * * *',
    $CRON$ SELECT finance.generate_obligations_sweep(); $CRON$
  );
END $$;
