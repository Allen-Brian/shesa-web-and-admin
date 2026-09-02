-- Migration: finance_charge_amount_versions
--
-- Phase 3 — effective-dated charge amounts. Lets Finance edit an
-- active charge's amount so the change takes effect from the NEXT
-- period, never the current or any past (already-frozen) one.
--
-- Model: `finance.charges.base_amount` (member charges) and
-- `finance.charge_targets.amount` (group charges) remain the founding
-- "version 0" in force from the charge's activation. This table holds
-- only SUBSEQUENT scheduled changes. Generation reads
-- COALESCE(effective_amount(period_start), founding amount) — so a
-- charge with no version rows behaves exactly as before (no backfill
-- needed), and a scheduled change dated to next period never touches
-- the current period's amount.
--
--   target_scope_id NULL  → the member/base amount (charges.base_amount)
--   target_scope_id set   → a per-target override (charge_targets.amount)
--
-- Spec Parts III + VI: obligations are frozen once generated; an edit
-- is a forward-dated new amount, not a rewrite of history.

-- =====================================================================
-- 1. Table
-- =====================================================================

CREATE TABLE finance.charge_amount_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id       UUID NOT NULL REFERENCES finance.charges(id) ON DELETE CASCADE,
  -- NULL = the base/member amount; non-null = a per-target override for
  -- that scope (branch / chapter / batch).
  target_scope_id UUID REFERENCES core.scopes(id) ON DELETE CASCADE,
  amount          NUMERIC(20, 4) NOT NULL CHECK (amount >= 0),
  currency        TEXT NOT NULL,
  effective_from  DATE NOT NULL,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One amount per (charge, target, effective date). COALESCE folds the
-- NULL target into a sentinel so the unique index treats "the base
-- amount" as a single slot (Postgres would otherwise let NULLs
-- duplicate). ON CONFLICT re-editing the same pending change updates it.
CREATE UNIQUE INDEX charge_amount_versions_uniq
  ON finance.charge_amount_versions
     (charge_id, COALESCE(target_scope_id, '00000000-0000-0000-0000-000000000000'::uuid), effective_from);

CREATE INDEX charge_amount_versions_lookup
  ON finance.charge_amount_versions (charge_id, target_scope_id, effective_from DESC);

COMMENT ON TABLE finance.charge_amount_versions IS
  'Scheduled forward-dated amount changes for a charge. base_amount / charge_targets.amount are version 0; rows here are subsequent changes effective_from a future period start. Read via finance.effective_amount at generation time.';

-- =====================================================================
-- 2. RLS — read follows the parent charge; writes are service-role /
--    SECURITY DEFINER only.
-- =====================================================================

ALTER TABLE finance.charge_amount_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY charge_amount_versions_select ON finance.charge_amount_versions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM finance.charges c
     WHERE c.id = charge_amount_versions.charge_id
       AND (core.has_permission(auth.uid(), c.scope_id, 'treasury.read')
            OR core.has_permission(auth.uid(), c.scope_id, 'finance.read'))
  ));

GRANT SELECT ON finance.charge_amount_versions TO authenticated;
GRANT ALL    ON finance.charge_amount_versions TO service_role;

-- =====================================================================
-- 3. effective_amount — the amount in force for a target at a period
-- =====================================================================
-- Returns the latest version with effective_from <= p_period_start, or
-- NULL when none exists (caller falls back to the founding amount).

CREATE OR REPLACE FUNCTION finance.effective_amount(
  p_charge_id       UUID,
  p_target_scope_id UUID,
  p_period_start    DATE
)
RETURNS NUMERIC(20, 4)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, finance, public
AS $$
  SELECT v.amount
    FROM finance.charge_amount_versions v
   WHERE v.charge_id = p_charge_id
     AND v.target_scope_id IS NOT DISTINCT FROM p_target_scope_id
     AND v.effective_from <= p_period_start
   ORDER BY v.effective_from DESC
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION finance.effective_amount(UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.effective_amount(UUID, UUID, DATE) TO authenticated, service_role;

COMMENT ON FUNCTION finance.effective_amount IS
  'The scheduled amount in force for (charge, target) at a period start, or NULL if no version applies. target NULL = base/member amount.';

-- =====================================================================
-- 4. schedule_amount_change — book a forward-dated amount change
-- =====================================================================
-- Inserts (or updates a still-pending) version effective from the START
-- of the NEXT period, so the current period stays frozen. Returns the
-- effective_from date so the caller can tell the operator when it lands.

CREATE OR REPLACE FUNCTION finance.schedule_amount_change(
  p_charge_id       UUID,
  p_target_scope_id UUID,
  p_amount          NUMERIC,
  p_actor           UUID
)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, finance, public
AS $$
DECLARE
  v_charge finance.charges%ROWTYPE;
  v_next   DATE;
BEGIN
  SELECT * INTO v_charge FROM finance.charges WHERE id = p_charge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'charge not found: %', p_charge_id USING ERRCODE = 'P0002';
  END IF;
  IF v_charge.recurrence = 'one_time' THEN
    RAISE EXCEPTION 'cannot schedule an amount change on a one-time charge'
      USING ERRCODE = '22023';
  END IF;

  -- Next period start = current period's exclusive end.
  SELECT p.period_end INTO v_next
    FROM finance.compute_period(v_charge.recurrence, v_charge.recurrence_interval, NOW()) p;

  INSERT INTO finance.charge_amount_versions
    (charge_id, target_scope_id, amount, currency, effective_from, created_by)
  VALUES
    (p_charge_id, p_target_scope_id, p_amount, v_charge.currency, v_next, p_actor)
  ON CONFLICT (charge_id, COALESCE(target_scope_id, '00000000-0000-0000-0000-000000000000'::uuid), effective_from)
  DO UPDATE SET amount = EXCLUDED.amount, created_by = EXCLUDED.created_by, created_at = NOW();

  RETURN v_next;
END;
$$;

REVOKE ALL ON FUNCTION finance.schedule_amount_change(UUID, UUID, NUMERIC, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.schedule_amount_change(UUID, UUID, NUMERIC, UUID) TO service_role;

COMMENT ON FUNCTION finance.schedule_amount_change IS
  'Books a forward-dated amount change effective from next period start; upserts a still-pending change. Rejects one-time charges. Returns the effective date.';

-- =====================================================================
-- 5. generate_obligations_for_charge — read effective amounts
-- =====================================================================
-- Same shape as the 20260722 version; the only changes:
--   * branch target amount  = COALESCE(effective_amount(target), ct.amount)
--   * member period base     = COALESCE(effective_amount(NULL), base_amount, 0)
--   * prorated flag now means "day-fraction applied" only (compared to
--     the effective base for the period, not charges.base_amount), which
--     also fixes the old overload where an exception-reduced amount was
--     mislabelled as prorated.

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
  v_period_base     NUMERIC(20, 4);
  v_effective_base  NUMERIC(20, 4);
  v_amount          NUMERIC(20, 4);
  v_days_in_period  INTEGER;
  v_days_owed       INTEGER;
  v_ex_id           UUID;
  v_ex_amount       NUMERIC(20, 4);
  v_ex_form         TEXT;
  v_ex_priority     INTEGER;

  v_target_scope_id UUID;
  v_ct_amount       NUMERIC(20, 4);
  v_target_amount   NUMERIC(20, 4);
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

  IF v_charge.activation_date IS NOT NULL AND v_charge.activation_date > p_reference THEN
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

  -- ── Branch-targeted: one obligation per charge_targets row ────────
  IF v_charge.target_party_type = 'branch' THEN
    FOR v_target_scope_id, v_ct_amount IN
      SELECT ct.target_scope_id, ct.amount
        FROM finance.charge_targets ct
       WHERE ct.charge_id = v_charge.id
    LOOP
      v_target_amount := COALESCE(
        finance.effective_amount(v_charge.id, v_target_scope_id, v_period_start),
        v_ct_amount
      );
      BEGIN
        INSERT INTO finance.obligations
          (charge_id, scope_id, party_type, party_id, amount, currency, status,
           exception_applied, prorated, period_start, period_end)
        VALUES
          (v_charge.id, v_charge.scope_id, 'branch', v_target_scope_id, v_target_amount,
           v_charge.currency, 'open',
           NULL, FALSE, v_period_start, v_period_end);
        v_inserted := v_inserted + 1;
      EXCEPTION WHEN unique_violation THEN
        CONTINUE;
      END;
    END LOOP;
    RETURN v_inserted;
  END IF;

  -- ── Member-targeted ──────────────────────────────────────────────
  v_days_in_period := (v_period_end - v_period_start);
  IF v_days_in_period <= 0 THEN
    v_days_in_period := 1;
  END IF;

  -- Base amount in force for THIS period (scheduled change or founding).
  v_period_base := COALESCE(
    finance.effective_amount(v_charge.id, NULL, v_period_start),
    v_charge.base_amount,
    0
  );

  FOR v_member_id, v_joined_at IN
    SELECT m.member_id, m.joined_at
      FROM core.memberships m
     WHERE m.scope_id = v_charge.scope_id
       AND m.membership_status IN ('active', 'passive')
  LOOP
    IF v_joined_at >= v_period_end THEN
      CONTINUE;
    END IF;

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
      v_effective_base := v_period_base;
    END IF;

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
         (v_amount < v_effective_base),
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
GRANT EXECUTE ON FUNCTION finance.generate_obligations_for_charge(UUID, TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION finance.generate_obligations_for_charge IS
  'Materialises obligations for the current period. Reads effective amounts (finance.effective_amount) so scheduled forward-dated changes apply from their period; founding base_amount / charge_targets.amount are the fallback. Individual: one row per active/passive member (exception + day-proration). Group: one row per charge_targets entry. Idempotent via UNIQUE(charge_id, party_type, party_id, period_start).';
