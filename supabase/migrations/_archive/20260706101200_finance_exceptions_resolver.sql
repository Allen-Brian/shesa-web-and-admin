-- Migration: finance_exceptions_resolver
--
-- Phase 3 M8 — the exception priority resolver + a small exchange-rate
-- helper for currency work. Spec Parts XI + XII.
--
-- Locked spec judgment #9 (no stacking):
--   individual (1000+) > attribute/relative (500+) > group (100+) > base (0)
-- The resolver walks by priority DESC and takes the FIRST match. A
-- member eligible for a batch tier AND an individual waiver gets ONLY
-- the individual waiver — not both subtracted. Stacking is how you get
-- negative dues and unexplainable balances.
--
-- Exception forms (already in the M1 enum):
--   individual — member_id column set; matches when e.member_id = param
--   fixed      — condition.batch_scope_ids: [uuid, ...]; matches when
--                the member's batch is in the list
--   relative   — condition.max_years_since_exit: N; matches when
--                (current_year - member.exit_year) <= N
--   senior     — condition.min_years_since_exit: N; matches when
--                (current_year - member.exit_year) >= N
--
-- The matched exception's id is recorded on the obligation as
-- exception_applied at generation time, so a member statement can
-- always explain the number.

-------------------------------------------------------------------------------
-- 1. resolve_exception_for_charge
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.resolve_exception_for_charge(
  p_charge_id UUID,
  p_member_id UUID,
  p_reference TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  exception_id       UUID,
  replacement_amount NUMERIC(20, 4),
  matched_form       TEXT,
  matched_priority   INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, core, finance, public
AS $$
DECLARE
  v_batch_id  UUID;
  v_exit_year INT;
  v_ref_year  INT;
BEGIN
  SELECT m.batch_scope_id, m.exit_year
    INTO v_batch_id, v_exit_year
  FROM core.members m
  WHERE m.id = p_member_id;

  IF NOT FOUND THEN
    -- Unknown member; caller falls back to base amount.
    RETURN;
  END IF;

  v_ref_year := EXTRACT(YEAR FROM p_reference)::int;

  RETURN QUERY
  SELECT
    e.id,
    e.replacement_amount,
    e.form::text,
    e.priority
  FROM finance.exceptions e
  WHERE e.charge_id = p_charge_id
    AND e.is_active
    AND (
      -- Individual: e.member_id column matches
      (e.form = 'individual' AND e.member_id = p_member_id)
      OR
      -- Fixed: batch list match
      (e.form = 'fixed'
       AND v_batch_id IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM jsonb_array_elements_text(
           COALESCE(e.condition->'batch_scope_ids', '[]'::jsonb)
         ) AS bs(id)
         WHERE bs.id = v_batch_id::text
       ))
      OR
      -- Relative: recently exited (small years-since-exit)
      (e.form = 'relative'
       AND v_exit_year IS NOT NULL
       AND (e.condition ? 'max_years_since_exit')
       AND (v_ref_year - v_exit_year) <= (e.condition->>'max_years_since_exit')::int
       AND (v_ref_year - v_exit_year) >= 0)
      OR
      -- Senior: exited long ago (large years-since-exit)
      (e.form = 'senior'
       AND v_exit_year IS NOT NULL
       AND (e.condition ? 'min_years_since_exit')
       AND (v_ref_year - v_exit_year) >= (e.condition->>'min_years_since_exit')::int)
    )
  ORDER BY e.priority DESC
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION finance.resolve_exception_for_charge(UUID, UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.resolve_exception_for_charge(UUID, UUID, TIMESTAMPTZ)
  TO authenticated, service_role;

COMMENT ON FUNCTION finance.resolve_exception_for_charge IS
  'Walks exceptions on a charge by priority DESC and returns the first that matches the member. No stacking (spec judgment #9). Called by generate_obligations_for_charge; the matched exception id is recorded on the obligation.';

-------------------------------------------------------------------------------
-- 2. generate_obligations_for_charge — wire the resolver in
-------------------------------------------------------------------------------
-- Replaces the M2B version. The change: after resolving the member's
-- effective base amount via resolve_exception_for_charge, apply
-- proration to that amount (not the charge's base_amount). Record the
-- matched exception's id on the obligation.

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
  v_effective_base  NUMERIC(20, 4);
  v_amount          NUMERIC(20, 4);
  v_days_in_period  INTEGER;
  v_days_owed       INTEGER;
  v_ex_id           UUID;
  v_ex_amount       NUMERIC(20, 4);
  v_ex_form         TEXT;
  v_ex_priority     INTEGER;
BEGIN
  SELECT * INTO v_charge FROM finance.charges WHERE id = p_charge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'charge not found: %', p_charge_id USING ERRCODE = 'P0002';
  END IF;

  IF v_charge.status <> 'active' THEN
    RETURN 0;
  END IF;

  IF v_charge.shape NOT IN ('charge', 'fixed') THEN
    RETURN 0;
  END IF;

  IF v_charge.target_party_type = 'branch' THEN
    RAISE NOTICE 'generate_obligations_for_charge: branch-as-body targeting deferred (charge %)', p_charge_id;
    RETURN 0;
  END IF;

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

  IF v_charge.activation_date IS NOT NULL AND v_charge.activation_date > p_reference THEN
    RETURN 0;
  END IF;

  v_days_in_period := (v_period_end - v_period_start);
  IF v_days_in_period <= 0 THEN
    v_days_in_period := 1;
  END IF;

  FOR v_member_id, v_joined_at IN
    SELECT m.member_id, m.joined_at
      FROM core.memberships m
     WHERE m.scope_id = v_charge.scope_id
       AND m.membership_status IN ('active', 'passive')
  LOOP
    IF v_joined_at >= v_period_end THEN
      CONTINUE;
    END IF;

    -- Resolve the effective base for THIS member via the priority walk.
    v_ex_id := NULL;
    v_ex_amount := NULL;
    v_ex_form := NULL;
    v_ex_priority := NULL;

    SELECT r.exception_id, r.replacement_amount, r.matched_form, r.matched_priority
      INTO v_ex_id, v_ex_amount, v_ex_form, v_ex_priority
      FROM finance.resolve_exception_for_charge(p_charge_id, v_member_id, p_reference) r;

    IF v_ex_amount IS NOT NULL THEN
      v_effective_base := v_ex_amount;
    ELSE
      v_effective_base := COALESCE(v_charge.base_amount, 0);
    END IF;

    -- Proration on the effective base.
    IF v_joined_at <= v_period_start OR v_effective_base = 0 THEN
      v_amount := v_effective_base;
    ELSE
      v_days_owed := (v_period_end - v_joined_at::date);
      IF v_days_owed >= v_days_in_period THEN
        v_amount := v_effective_base;
      ELSIF v_days_owed <= 0 THEN
        CONTINUE;
      ELSE
        v_amount := ROUND(v_effective_base * v_days_owed::numeric / v_days_in_period::numeric, 2);
      END IF;
    END IF;

    BEGIN
      INSERT INTO finance.obligations
        (charge_id, scope_id, party_type, party_id, amount, currency, status,
         exception_applied, prorated, period_start, period_end)
      VALUES
        (v_charge.id, v_charge.scope_id, 'member', v_member_id, v_amount,
         v_charge.currency, 'open',
         v_ex_id,
         (v_amount < COALESCE(v_charge.base_amount, v_effective_base)),
         v_period_start, v_period_end);
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION finance.generate_obligations_for_charge(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.generate_obligations_for_charge(UUID, TIMESTAMPTZ)
  TO service_role;

COMMENT ON FUNCTION finance.generate_obligations_for_charge IS
  'M8-integrated generation. For each eligible member, resolves the exception via priority walk, applies proration on the resulting effective base, and INSERTs the obligation with exception_applied set. Idempotent via M1 UNIQUE(charge_id, party_type, party_id, period_start).';

-------------------------------------------------------------------------------
-- 3. get_exchange_rate — small helper for currency work
-------------------------------------------------------------------------------
-- Returns the most recent rate for (from, to) with effective_at <=
-- p_at. Used by the future cross-currency payment path and by Global's
-- consolidated report views. Available now so callers can snapshot the
-- rate at record time.

CREATE OR REPLACE FUNCTION finance.get_exchange_rate(
  p_from_currency TEXT,
  p_to_currency   TEXT,
  p_at            TIMESTAMPTZ DEFAULT NOW()
)
RETURNS NUMERIC(20, 8)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, finance, public
AS $$
DECLARE
  v_rate NUMERIC(20, 8);
BEGIN
  IF p_from_currency = p_to_currency THEN
    RETURN 1;
  END IF;

  SELECT rate INTO v_rate
  FROM finance.exchange_rates
  WHERE from_currency = p_from_currency
    AND to_currency = p_to_currency
    AND effective_at <= p_at
  ORDER BY effective_at DESC
  LIMIT 1;

  RETURN v_rate;   -- NULL if no rate on file — caller decides what to do
END;
$$;

REVOKE ALL ON FUNCTION finance.get_exchange_rate(TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.get_exchange_rate(TEXT, TEXT, TIMESTAMPTZ)
  TO authenticated, service_role;

COMMENT ON FUNCTION finance.get_exchange_rate IS
  'Returns the most recent stored rate for (from, to) with effective_at <= p_at. Same-currency returns 1. NULL when no rate is on file — caller decides whether to raise or default.';
