-- Migration: finance_groups_targets_reconciliations
--
-- Landing the three schema pieces the Groups refactor needs:
--
--   1. `finance.groups` — mainstream-only lens that tags rows across
--      `charges/payments/expenses` so we can browse an event's
--      money-flow in isolation. Groups do NOT silo — the mainstream
--      pages still show every row; the group is a filter.
--   2. `finance.charge_targets` — per-target amount overrides for
--      group-shape charges (target_party_type='branch'). A group
--      charge can say "Branch A + B pay 250k; Branch C pays 150k;
--      Batch 2019 pays 100k" — one row per target scope.
--   3. `finance.reconciliations` — presence-based marker on a payment
--      to say "this has been reconciled against the bank / MoMo /
--      cash record." UI drives it as a column + row action + mass
--      action + filter chip on the Transactions table.
--
-- Also:
--   - Add nullable `group_id` to charges/payments/expenses.
--   - Payment INSERT trigger copies parent `charges.group_id` down
--     onto the payment so payments-only queries filter cheaply.
--   - Extend `finance.generate_obligations_for_charge` to actually
--     handle `target_party_type='branch'` using the new targets table
--     (previously an early-return with a NOTICE).
--   - Two new permission keys: `group.manage` (create/close groups)
--     and `reconciliation.record` (flip payments reconciled).
--   - Public ticket-purchase RPC that mirrors `record_public_donation`
--     for the AGM ticket/attire flows. Anon-executable.

BEGIN;

-- =====================================================================
-- 1. finance.groups
-- =====================================================================
--
-- Groups are mainstream-only. RLS enforces both the write gate (only a
-- caller with `group.manage` at mainstream can INSERT/UPDATE/DELETE) and
-- the scope_id lock (must equal the mainstream scope). Branches can
-- never create groups; that keeps finances from mixing across the
-- autonomy boundary.

CREATE TABLE finance.groups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE
                    CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,80}$'),
  name              TEXT NOT NULL
                    CHECK (length(trim(name)) BETWEEN 2 AND 200),
  description       TEXT NULL,
  starts_on         DATE NULL,
  ends_on           DATE NULL
                    CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on),

  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'closed', 'archived')),
  show_in_sidebar   BOOLEAN NOT NULL DEFAULT TRUE,

  scope_id          UUID NOT NULL REFERENCES core.scopes(id) ON DELETE RESTRICT,

  created_by        UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX groups_status_idx   ON finance.groups (status);
CREATE INDEX groups_visible_idx  ON finance.groups (show_in_sidebar) WHERE show_in_sidebar;

COMMENT ON TABLE finance.groups IS
  'Event-scoped lens over finance activity (AGM 2026, Homecoming 2027, …). Mainstream-scope only. Group data still appears in the general finance pages; the group is a filter, not a silo.';

-- Trigger: scope_id must always be the (single) mainstream scope. We
-- resolve it live so a future rename of the mainstream scope doesn't
-- break the check.
CREATE OR REPLACE FUNCTION finance.groups_enforce_mainstream_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, core, finance, public
AS $$
DECLARE
  v_mainstream_id UUID;
BEGIN
  SELECT id INTO v_mainstream_id
    FROM core.scopes
   WHERE scope_type = 'mainstream'
   LIMIT 1;
  IF v_mainstream_id IS NULL THEN
    RAISE EXCEPTION 'no mainstream scope configured'
      USING ERRCODE = '22023';
  END IF;
  IF NEW.scope_id <> v_mainstream_id THEN
    RAISE EXCEPTION 'finance.groups.scope_id must be the mainstream scope'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER groups_enforce_mainstream_scope
  BEFORE INSERT OR UPDATE OF scope_id ON finance.groups
  FOR EACH ROW EXECUTE FUNCTION finance.groups_enforce_mainstream_scope();

-- =====================================================================
-- 2. finance.charge_targets
-- =====================================================================
--
-- One row per target scope (branch or batch) for a group-shape charge.
-- The generator writes one obligation per row with the row's amount.

CREATE TABLE finance.charge_targets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id        UUID NOT NULL REFERENCES finance.charges(id) ON DELETE CASCADE,
  target_scope_id  UUID NOT NULL REFERENCES core.scopes(id)     ON DELETE RESTRICT,
  amount           NUMERIC(20, 4) NOT NULL CHECK (amount > 0),
  currency         TEXT NOT NULL CHECK (length(currency) = 3),

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (charge_id, target_scope_id)
);

CREATE INDEX charge_targets_charge_idx ON finance.charge_targets (charge_id);
CREATE INDEX charge_targets_scope_idx  ON finance.charge_targets (target_scope_id);

COMMENT ON TABLE finance.charge_targets IS
  'Per-target amount overrides for group-shape charges (target_party_type=branch). Rows point at core.scopes — branches or batches. Ignored for individual charges.';

-- Guard: only usable with branch-targeted charges, and the currency
-- must match the parent charge (avoid a slow drift where per-target
-- amounts land in a different currency than the charge advertises).
CREATE OR REPLACE FUNCTION finance.charge_targets_enforce_shape()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, core, finance, public
AS $$
DECLARE
  v_charge finance.charges%ROWTYPE;
BEGIN
  SELECT * INTO v_charge FROM finance.charges WHERE id = NEW.charge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'charge not found: %', NEW.charge_id USING ERRCODE = 'P0002';
  END IF;
  IF v_charge.target_party_type IS DISTINCT FROM 'branch' THEN
    RAISE EXCEPTION 'charge_targets only apply to branch-targeted charges (charge %)', NEW.charge_id
      USING ERRCODE = '22023';
  END IF;
  IF NEW.currency <> v_charge.currency THEN
    RAISE EXCEPTION 'charge_targets.currency (%) must match parent charge (%)', NEW.currency, v_charge.currency
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER charge_targets_enforce_shape
  BEFORE INSERT OR UPDATE ON finance.charge_targets
  FOR EACH ROW EXECUTE FUNCTION finance.charge_targets_enforce_shape();

-- =====================================================================
-- 3. finance.reconciliations
-- =====================================================================

CREATE TABLE finance.reconciliations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id     UUID NOT NULL UNIQUE
                 REFERENCES finance.payments(id) ON DELETE CASCADE,
  reconciled_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reconciled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  matched_ref    TEXT NULL CHECK (matched_ref IS NULL OR length(matched_ref) <= 200),
  notes          TEXT NULL CHECK (notes       IS NULL OR length(notes)       <= 1000)
);

CREATE INDEX reconciliations_by_idx      ON finance.reconciliations (reconciled_by);
CREATE INDEX reconciliations_when_idx    ON finance.reconciliations (reconciled_at DESC);

COMMENT ON TABLE finance.reconciliations IS
  'Presence marker: a payment is reconciled iff a row exists here. Simple by design — the Transactions UI drives it as a column, a row action, a mass action, and a filter chip. No status enum.';

-- =====================================================================
-- 4. group_id columns on the three money-flow tables
-- =====================================================================
--
-- Nullable everywhere — the vast majority of rows never carry a group.

ALTER TABLE finance.charges
  ADD COLUMN group_id UUID NULL REFERENCES finance.groups(id) ON DELETE SET NULL;
ALTER TABLE finance.payments
  ADD COLUMN group_id UUID NULL REFERENCES finance.groups(id) ON DELETE SET NULL;
ALTER TABLE finance.expenses
  ADD COLUMN group_id UUID NULL REFERENCES finance.groups(id) ON DELETE SET NULL;

CREATE INDEX charges_group_idx  ON finance.charges  (group_id) WHERE group_id IS NOT NULL;
CREATE INDEX payments_group_idx ON finance.payments (group_id) WHERE group_id IS NOT NULL;
CREATE INDEX expenses_group_idx ON finance.expenses (group_id) WHERE group_id IS NOT NULL;

-- Trigger: when a payment lands with NULL group_id but its parent
-- charge carries one, copy it down. Payments attached to obligations
-- inherit via the obligation's charge too.
CREATE OR REPLACE FUNCTION finance.payments_inherit_group_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, core, finance, public
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  IF NEW.group_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.charge_id IS NOT NULL THEN
    SELECT group_id INTO v_group_id FROM finance.charges WHERE id = NEW.charge_id;
    IF v_group_id IS NOT NULL THEN
      NEW.group_id := v_group_id;
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.obligation_id IS NOT NULL THEN
    SELECT c.group_id INTO v_group_id
      FROM finance.obligations o
      JOIN finance.charges c ON c.id = o.charge_id
     WHERE o.id = NEW.obligation_id;
    IF v_group_id IS NOT NULL THEN
      NEW.group_id := v_group_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER payments_inherit_group_id
  BEFORE INSERT ON finance.payments
  FOR EACH ROW EXECUTE FUNCTION finance.payments_inherit_group_id();

-- =====================================================================
-- 5. Permissions
-- =====================================================================
--
-- group.manage        — create / close / archive groups + toggle sidebar.
--                       Granted to mainstream_admin and to finance (at
--                       mainstream) only.
-- reconciliation.record — flip payments reconciled / unreconciled.
--                       Granted to the same two roles.

INSERT INTO core.permissions (id, key, description) VALUES
  ('22222222-0000-0000-0000-000000000070', 'group.manage',
   'Create, close, archive, or hide finance groups (mainstream-only).'),
  ('22222222-0000-0000-0000-000000000071', 'reconciliation.record',
   'Mark payments as reconciled / undo reconciliation.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM core.roles r, core.permissions p
 WHERE r.key IN ('mainstream_admin', 'finance')
   AND p.key IN ('group.manage', 'reconciliation.record')
ON CONFLICT DO NOTHING;

-- =====================================================================
-- 6. RLS
-- =====================================================================

ALTER TABLE finance.groups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.charge_targets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.reconciliations  ENABLE ROW LEVEL SECURITY;

-- finance.groups
CREATE POLICY groups_select ON finance.groups
  FOR SELECT TO authenticated
  USING (
    core.has_permission(auth.uid(), scope_id, 'treasury.read')
    OR core.has_permission(auth.uid(), scope_id, 'finance.read')
  );
CREATE POLICY groups_insert ON finance.groups
  FOR INSERT TO authenticated
  WITH CHECK (core.has_permission(auth.uid(), scope_id, 'group.manage'));
CREATE POLICY groups_update ON finance.groups
  FOR UPDATE TO authenticated
  USING     (core.has_permission(auth.uid(), scope_id, 'group.manage'))
  WITH CHECK(core.has_permission(auth.uid(), scope_id, 'group.manage'));
CREATE POLICY groups_delete ON finance.groups
  FOR DELETE TO authenticated
  USING (core.has_permission(auth.uid(), scope_id, 'group.manage'));

-- finance.charge_targets — read follows the parent charge; write
-- requires charge.update at the charge's scope.
CREATE POLICY charge_targets_select ON finance.charge_targets
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM finance.charges c
     WHERE c.id = charge_targets.charge_id
       AND (
         core.has_permission(auth.uid(), c.scope_id, 'treasury.read')
         OR core.has_permission(auth.uid(), c.scope_id, 'finance.read')
       )
  ));
CREATE POLICY charge_targets_write ON finance.charge_targets
  FOR ALL TO authenticated
  USING     (EXISTS (SELECT 1 FROM finance.charges c
                      WHERE c.id = charge_targets.charge_id
                        AND core.has_permission(auth.uid(), c.scope_id, 'charge.update')))
  WITH CHECK(EXISTS (SELECT 1 FROM finance.charges c
                      WHERE c.id = charge_targets.charge_id
                        AND core.has_permission(auth.uid(), c.scope_id, 'charge.update')));

-- finance.reconciliations — read follows the parent payment; write
-- requires reconciliation.record at the payment's scope.
CREATE POLICY reconciliations_select ON finance.reconciliations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM finance.payments p
     WHERE p.id = reconciliations.payment_id
       AND (
         core.has_permission(auth.uid(), p.scope_id, 'treasury.read')
         OR core.has_permission(auth.uid(), p.scope_id, 'finance.read')
       )
  ));
CREATE POLICY reconciliations_write ON finance.reconciliations
  FOR ALL TO authenticated
  USING     (EXISTS (SELECT 1 FROM finance.payments p
                      WHERE p.id = reconciliations.payment_id
                        AND core.has_permission(auth.uid(), p.scope_id, 'reconciliation.record')))
  WITH CHECK(EXISTS (SELECT 1 FROM finance.payments p
                      WHERE p.id = reconciliations.payment_id
                        AND core.has_permission(auth.uid(), p.scope_id, 'reconciliation.record')));

GRANT SELECT           ON finance.groups, finance.charge_targets, finance.reconciliations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON finance.groups, finance.charge_targets, finance.reconciliations TO authenticated;
GRANT ALL              ON finance.groups, finance.charge_targets, finance.reconciliations TO service_role;

-- =====================================================================
-- 7. generate_obligations_for_charge — branch-target support
-- =====================================================================
--
-- Rewrites the function to handle target_party_type='branch' via
-- finance.charge_targets. Member-target behaviour is unchanged; the
-- refactor keeps the same code path for the member branch (copy of
-- the previous body, minus the early-return NOTICE for branch).

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

  -- Member-branch locals
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

  -- Branch-branch locals
  v_target_scope_id UUID;
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

  -- Common period computation.
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
    FOR v_target_scope_id, v_target_amount IN
      SELECT ct.target_scope_id, ct.amount
        FROM finance.charge_targets ct
       WHERE ct.charge_id = v_charge.id
    LOOP
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

  -- ── Member-targeted (unchanged from previous implementation) ─────
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
  'Materialises obligations for the current period. Individual charges: one row per active/passive member (proration + exceptions applied). Group charges: one row per finance.charge_targets entry (branch/batch, no proration, no exceptions).';

-- =====================================================================
-- 8. record_public_ticket_purchase — public entry for AGM tickets + attire
-- =====================================================================
--
-- Mirror of record_public_donation, tuned for ticketed-shape charges.
-- Accepts a quantity + unit_price is derived from the charge's
-- base_amount (single source of truth). The buyer's metadata bag lives
-- on the payment (payer_name/email/phone/location + free-form metadata
-- for things like AGM attire measurements).

CREATE OR REPLACE FUNCTION finance.record_public_ticket_purchase(
  p_charge_id       UUID,
  p_quantity        INTEGER,
  p_method          finance.payment_method,
  p_payer_name      TEXT DEFAULT NULL,
  p_payer_email     TEXT DEFAULT NULL,
  p_payer_phone     TEXT DEFAULT NULL,
  p_payer_location  TEXT DEFAULT NULL,
  p_metadata        JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  payment_id     UUID,
  receipt_token  TEXT,
  receipt_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, finance, public
AS $$
DECLARE
  v_charge     finance.charges%ROWTYPE;
  v_amount     NUMERIC(20, 4);
  v_payment_id UUID;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'quantity must be positive' USING ERRCODE = '22023';
  END IF;
  IF p_payer_name IS NOT NULL AND length(p_payer_name) > 200 THEN
    RAISE EXCEPTION 'payer_name too long' USING ERRCODE = '22023';
  END IF;
  IF p_payer_email IS NOT NULL AND length(p_payer_email) > 320 THEN
    RAISE EXCEPTION 'payer_email too long' USING ERRCODE = '22023';
  END IF;
  IF p_payer_phone IS NOT NULL AND length(p_payer_phone) > 80 THEN
    RAISE EXCEPTION 'payer_phone too long' USING ERRCODE = '22023';
  END IF;
  IF p_payer_location IS NOT NULL AND length(p_payer_location) > 300 THEN
    RAISE EXCEPTION 'payer_location too long' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_charge FROM finance.charges WHERE id = p_charge_id;

  -- Bland "not accepting" error on any invalid target — never reveal which
  -- part was wrong to an anonymous caller.
  IF NOT FOUND
     OR v_charge.shape <> 'ticketed'
     OR v_charge.status <> 'active'
     OR v_charge.lifecycle IS DISTINCT FROM 'open'
     OR v_charge.base_amount IS NULL
  THEN
    RAISE EXCEPTION 'this item is not on sale' USING ERRCODE = '42501';
  END IF;

  v_amount := v_charge.base_amount * p_quantity;

  INSERT INTO finance.payments
    (obligation_id, charge_id, scope_id, payer_member_id,
     amount, currency, method, source, recorded_by,
     metadata)
  VALUES
    (NULL, v_charge.id, v_charge.scope_id, NULL,
     v_amount, v_charge.currency, p_method, 'auto', NULL,
     COALESCE(p_metadata, '{}'::jsonb)
       || jsonb_build_object(
         'public_ticket_purchase', TRUE,
         'quantity',       p_quantity,
         'payer_name',     p_payer_name,
         'payer_email',    p_payer_email,
         'payer_phone',    p_payer_phone,
         'payer_location', p_payer_location
       ))
  RETURNING id INTO v_payment_id;

  -- Ticket row so the tickets table + reports pick it up.
  INSERT INTO finance.tickets (charge_id, payment_id, buyer_member_id, quantity, unit_price)
  VALUES (v_charge.id, v_payment_id, NULL, p_quantity, v_charge.base_amount);

  RETURN QUERY
  SELECT
    v_payment_id,
    rv.token,
    rv.receipt_number
  FROM finance.receipt_verifications rv
  WHERE rv.payment_id = v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION finance.record_public_ticket_purchase(UUID, INTEGER, finance.payment_method, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.record_public_ticket_purchase(UUID, INTEGER, finance.payment_method, TEXT, TEXT, TEXT, TEXT, JSONB)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION finance.record_public_ticket_purchase IS
  'Public ticket-purchase entry (AGM tickets + attire orders). SECURITY DEFINER, anon-executable. Accepts only ticketed-shape live charges — bland 42501 on any invalid target. Payer identity lives in payments.metadata; auto-source through the M5 receipt trigger.';

COMMIT;
