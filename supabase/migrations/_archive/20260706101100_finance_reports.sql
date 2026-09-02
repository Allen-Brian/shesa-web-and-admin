-- Migration: finance_reports
--
-- Phase 3 M9 — the answer set. Spec Part XIII. Six report SQL functions
-- covering the questions the financial secretary actually asks:
--
--   get_collections            — money in over a period, by charge
--   get_arrears                — who owes (dues only; contributions
--                                have no arrears per spec lock #7)
--   get_contribution_progress  — raised vs. goal + sold vs. capacity
--   get_payment_method_breakdown — how money arrived (MoMo/Orange/cash)
--   get_expense_report_by_category — expenses by category and period
--   get_member_statement       — one member's obligations + payments +
--                                balance
--
-- Every report is auth-gated. Callers need `finance.report` or the
-- legacy `treasury.read` at the target scope. get_member_statement is
-- the exception: it also admits the member's own auth account.
--
-- These functions do NOT paginate. Reports up to a few thousand rows
-- return in a single call; anything larger is an export path (M9
-- follow-up: get_exports for CSV/Excel).
--
-- Currency: every returned amount stays in the scope's native currency.
-- Cross-currency rollups (Global's consolidated view) happen at the
-- display layer with rate_snapshot on each row (M8).

-------------------------------------------------------------------------------
-- Common auth helper: report-read at scope
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.can_read_reports(p_scope_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, core, public
AS $$
BEGIN
  RETURN core.has_permission(auth.uid(), p_scope_id, 'finance.report')
      OR core.has_permission(auth.uid(), p_scope_id, 'treasury.read')
      OR core.has_permission(auth.uid(), p_scope_id, 'finance.read');
END;
$$;

REVOKE ALL ON FUNCTION finance.can_read_reports(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.can_read_reports(UUID) TO authenticated, service_role;

-------------------------------------------------------------------------------
-- 1. get_collections — money in, grouped by charge
-------------------------------------------------------------------------------
-- Sums non-reversed payments per charge, over the window. Contributions
-- + charges + donations all appear here since payments carry charge_id.
-- Reversals are excluded via the not-exists subquery.

CREATE OR REPLACE FUNCTION finance.get_collections(
  p_scope_id UUID,
  p_from     TIMESTAMPTZ DEFAULT NULL,
  p_to       TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  charge_id       UUID,
  charge_name     TEXT,
  shape           TEXT,
  payment_count   BIGINT,
  total_collected NUMERIC(20, 4)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, core, finance, public
AS $$
BEGIN
  IF NOT finance.can_read_reports(p_scope_id) THEN
    RAISE EXCEPTION 'finance.report at scope % denied', p_scope_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.id                                    AS charge_id,
    c.name                                  AS charge_name,
    c.shape::text                           AS shape,
    COUNT(p.id)                             AS payment_count,
    COALESCE(SUM(p.amount), 0)              AS total_collected
  FROM finance.charges c
  LEFT JOIN finance.payments p
    ON p.charge_id = c.id
   AND p.reverses_payment_id IS NULL
   AND NOT EXISTS (
     SELECT 1 FROM finance.payments r WHERE r.reverses_payment_id = p.id
   )
   AND (p_from IS NULL OR p.created_at >= p_from)
   AND p.created_at <= p_to
  WHERE c.scope_id = p_scope_id
  GROUP BY c.id, c.name, c.shape
  ORDER BY total_collected DESC, c.name;
END;
$$;

REVOKE ALL ON FUNCTION finance.get_collections(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.get_collections(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;

-------------------------------------------------------------------------------
-- 2. get_arrears — outstanding obligations per member
-------------------------------------------------------------------------------
-- Only dues charges create obligations (spec lock #7). This report
-- surfaces obligations with status IN ('open', 'partial'), summing the
-- owed amount minus non-reversed payments so far. Excludes cancelled +
-- forgiven per spec Part VI.

CREATE OR REPLACE FUNCTION finance.get_arrears(
  p_scope_id UUID
)
RETURNS TABLE (
  member_id       UUID,
  member_name     TEXT,
  charge_id       UUID,
  charge_name     TEXT,
  period_start    DATE,
  amount_owed     NUMERIC(20, 4),
  amount_paid     NUMERIC(20, 4),
  arrears         NUMERIC(20, 4)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, core, finance, public
AS $$
BEGIN
  IF NOT finance.can_read_reports(p_scope_id) THEN
    RAISE EXCEPTION 'finance.report at scope % denied', p_scope_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    o.party_id                              AS member_id,
    m.full_name                             AS member_name,
    o.charge_id                             AS charge_id,
    c.name                                  AS charge_name,
    o.period_start                          AS period_start,
    o.amount                                AS amount_owed,
    COALESCE(paid.paid_sum, 0)              AS amount_paid,
    o.amount - COALESCE(paid.paid_sum, 0)   AS arrears
  FROM finance.obligations o
  JOIN finance.charges c    ON c.id = o.charge_id
  JOIN core.members m       ON m.id = o.party_id
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(p.amount), 0) AS paid_sum
    FROM finance.payments p
    WHERE p.obligation_id = o.id
      AND p.reverses_payment_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM finance.payments r WHERE r.reverses_payment_id = p.id
      )
  ) paid ON TRUE
  WHERE o.scope_id = p_scope_id
    AND o.party_type = 'member'
    AND o.status IN ('open', 'partial')
  ORDER BY (o.amount - COALESCE(paid.paid_sum, 0)) DESC, m.full_name;
END;
$$;

REVOKE ALL ON FUNCTION finance.get_arrears(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.get_arrears(UUID) TO authenticated, service_role;

-------------------------------------------------------------------------------
-- 3. get_contribution_progress — raised vs. goal, sold vs. capacity
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.get_contribution_progress(
  p_charge_id UUID
)
RETURNS TABLE (
  charge_id      UUID,
  charge_name    TEXT,
  shape          TEXT,
  goal_amount    NUMERIC(20, 4),
  raised         NUMERIC(20, 4),
  capacity       INTEGER,
  sold           BIGINT,
  contributor_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, core, finance, public
AS $$
DECLARE
  v_scope_id UUID;
BEGIN
  SELECT c.scope_id INTO v_scope_id FROM finance.charges c WHERE c.id = p_charge_id;
  IF v_scope_id IS NULL THEN
    RAISE EXCEPTION 'charge % not found', p_charge_id USING ERRCODE = 'P0002';
  END IF;
  IF NOT finance.can_read_reports(v_scope_id) THEN
    RAISE EXCEPTION 'finance.report at scope % denied', v_scope_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.id                                             AS charge_id,
    c.name                                           AS charge_name,
    c.shape::text                                    AS shape,
    c.goal_amount                                    AS goal_amount,
    COALESCE(pay.raised, 0)                          AS raised,
    c.capacity                                       AS capacity,
    COALESCE(tix.sold, 0)                            AS sold,
    COALESCE(pay.contributors, 0)                    AS contributor_count
  FROM finance.charges c
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(SUM(p.amount), 0)                     AS raised,
      COUNT(DISTINCT p.payer_member_id)              AS contributors
    FROM finance.payments p
    WHERE p.charge_id = c.id
      AND p.reverses_payment_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM finance.payments r WHERE r.reverses_payment_id = p.id
      )
  ) pay ON TRUE
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(t.quantity), 0)::bigint AS sold
    FROM finance.tickets t
    WHERE t.charge_id = c.id
  ) tix ON TRUE
  WHERE c.id = p_charge_id;
END;
$$;

REVOKE ALL ON FUNCTION finance.get_contribution_progress(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.get_contribution_progress(UUID)
  TO authenticated, service_role;

-------------------------------------------------------------------------------
-- 4. get_payment_method_breakdown — how money arrived
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.get_payment_method_breakdown(
  p_scope_id UUID,
  p_from     TIMESTAMPTZ DEFAULT NULL,
  p_to       TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  method         TEXT,
  payment_count  BIGINT,
  total_amount   NUMERIC(20, 4)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, core, finance, public
AS $$
BEGIN
  IF NOT finance.can_read_reports(p_scope_id) THEN
    RAISE EXCEPTION 'finance.report at scope % denied', p_scope_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.method::text                          AS method,
    COUNT(*)                                AS payment_count,
    COALESCE(SUM(p.amount), 0)              AS total_amount
  FROM finance.payments p
  WHERE p.scope_id = p_scope_id
    AND p.reverses_payment_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM finance.payments r WHERE r.reverses_payment_id = p.id
    )
    AND (p_from IS NULL OR p.created_at >= p_from)
    AND p.created_at <= p_to
  GROUP BY p.method
  ORDER BY total_amount DESC;
END;
$$;

REVOKE ALL ON FUNCTION finance.get_payment_method_breakdown(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.get_payment_method_breakdown(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;

-------------------------------------------------------------------------------
-- 5. get_expense_report_by_category — expenses by category and period
-------------------------------------------------------------------------------
-- Only 'recorded' + 'approved' expenses count. Reversals subtract via
-- the not-exists chain (same shape as payments).

CREATE OR REPLACE FUNCTION finance.get_expense_report_by_category(
  p_scope_id UUID,
  p_from     TIMESTAMPTZ DEFAULT NULL,
  p_to       TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  category_id    UUID,
  category_key   TEXT,
  category_name  TEXT,
  expense_count  BIGINT,
  total_amount   NUMERIC(20, 4)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, core, finance, public
AS $$
BEGIN
  IF NOT finance.can_read_reports(p_scope_id) THEN
    RAISE EXCEPTION 'finance.report at scope % denied', p_scope_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    e.category_id                              AS category_id,
    ec.key                                     AS category_key,
    ec.name                                    AS category_name,
    COUNT(*)                                   AS expense_count,
    COALESCE(SUM(e.amount), 0)                 AS total_amount
  FROM finance.expenses e
  LEFT JOIN finance.expense_categories ec ON ec.id = e.category_id
  WHERE e.scope_id = p_scope_id
    AND e.status IN ('recorded', 'approved')
    AND e.reverses_expense_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM finance.expenses r WHERE r.reverses_expense_id = e.id
    )
    AND (p_from IS NULL OR e.incurred_at >= p_from)
    AND e.incurred_at <= p_to
  GROUP BY e.category_id, ec.key, ec.name
  ORDER BY total_amount DESC;
END;
$$;

REVOKE ALL ON FUNCTION finance.get_expense_report_by_category(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.get_expense_report_by_category(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;

-------------------------------------------------------------------------------
-- 6. get_member_statement — one member's obligations, payments, balance
-------------------------------------------------------------------------------
-- Auth: finance.report at ANY scope where the member has an obligation,
-- OR the caller IS the member (via core.member_accounts.auth_user_id).
--
-- The report groups by (charge, period) and shows amount owed +
-- amount paid + status per row. A summary row at the caller side
-- computes the total balance.

CREATE OR REPLACE FUNCTION finance.get_member_statement(
  p_member_id UUID,
  p_from      TIMESTAMPTZ DEFAULT NULL,
  p_to        TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  charge_id      UUID,
  charge_name    TEXT,
  scope_id       UUID,
  scope_name     TEXT,
  period_start   DATE,
  obligation_status TEXT,
  amount_owed    NUMERIC(20, 4),
  amount_paid    NUMERIC(20, 4),
  balance        NUMERIC(20, 4)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, core, finance, public
AS $$
DECLARE
  v_is_self BOOLEAN;
  v_has_read BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM core.member_accounts ma
    WHERE ma.member_id = p_member_id
      AND ma.auth_user_id = auth.uid()
  ) INTO v_is_self;

  IF NOT v_is_self THEN
    SELECT EXISTS (
      SELECT 1 FROM finance.obligations o
      WHERE o.party_id = p_member_id
        AND o.party_type = 'member'
        AND finance.can_read_reports(o.scope_id)
    ) INTO v_has_read;

    IF NOT v_has_read THEN
      RAISE EXCEPTION 'finance.report for member % denied', p_member_id
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    o.charge_id                              AS charge_id,
    c.name                                   AS charge_name,
    o.scope_id                               AS scope_id,
    s.name                                   AS scope_name,
    o.period_start                           AS period_start,
    o.status::text                           AS obligation_status,
    o.amount                                 AS amount_owed,
    COALESCE(paid.paid_sum, 0)               AS amount_paid,
    o.amount - COALESCE(paid.paid_sum, 0)    AS balance
  FROM finance.obligations o
  JOIN finance.charges c ON c.id = o.charge_id
  JOIN core.scopes s     ON s.id = o.scope_id
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(p.amount), 0) AS paid_sum
    FROM finance.payments p
    WHERE p.obligation_id = o.id
      AND p.reverses_payment_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM finance.payments r WHERE r.reverses_payment_id = p.id
      )
      AND (p_from IS NULL OR p.created_at >= p_from)
      AND p.created_at <= p_to
  ) paid ON TRUE
  WHERE o.party_id = p_member_id
    AND o.party_type = 'member'
    AND (p_from IS NULL OR o.created_at >= p_from)
    AND o.created_at <= p_to
  ORDER BY o.period_start DESC, c.name;
END;
$$;

REVOKE ALL ON FUNCTION finance.get_member_statement(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.get_member_statement(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;
