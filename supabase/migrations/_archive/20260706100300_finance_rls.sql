-- Migration: finance_rls
--
-- Phase 3 M1 fourth migration. RLS policies for every finance table.
--
-- Two-layer authorization (ADR-0006 pattern used across the codebase):
--   1. RLS is the always-on floor. A direct supabase-js SELECT/INSERT
--      that bypasses the Edge Function still passes through these
--      policies. The floor prevents drive-by data leaks.
--   2. Edge Functions add the second layer: idempotency, structured
--      error envelope, cross-table invariants, audit. The service
--      authority (policy module) enforces "can this actor create THIS
--      shape here?" — RLS only enforces "can this actor see / write
--      rows at this scope?"
--
-- What's NOT in this migration (deferred to the milestones that need it):
--   - INSERT policies whose Edge Function counterpart doesn't exist yet
--     (charge creation lands with M2, payments with M4, etc). For M1
--     the SELECT floor is the whole story on the read side and
--     service_role owns writes until each milestone opens its write
--     path.
--   - The public receipt-verification path (M5) — a SECURITY DEFINER
--     RPC that anon can EXECUTE and that returns the minimal
--     disclosure. RLS on receipt_verifications stays authenticated-only.
--
-- Every policy calls core.has_permission (the SECURITY DEFINER tree
-- walk from Phase 1 E3) so global admins (NULL-scope grant) pass at
-- every child scope automatically.

-------------------------------------------------------------------------------
-- 1. Reference tables — open SELECT to authenticated
-------------------------------------------------------------------------------
-- Categories + exchange rates are catalog data. Every scope's finance
-- officer needs to see the same list; hiding them buys nothing and
-- forces boilerplate joins per query.

CREATE POLICY charge_categories_select_authenticated ON finance.charge_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY expense_categories_select_authenticated ON finance.expense_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY exchange_rates_select_authenticated ON finance.exchange_rates
  FOR SELECT TO authenticated USING (true);

-------------------------------------------------------------------------------
-- 2. Charges + contribution_extensions — scoped SELECT
-------------------------------------------------------------------------------
-- Anyone with treasury.read at the scope can see charges (they need to
-- know what they've been billed). The legacy finance.read key is
-- honored for backwards compatibility with the seed's Finance role
-- until every Edge Function migrates to the grain keys.

CREATE POLICY charges_select_at_scope ON finance.charges
  FOR SELECT TO authenticated
  USING (
    core.has_permission(auth.uid(), scope_id, 'treasury.read')
    OR core.has_permission(auth.uid(), scope_id, 'finance.read')
  );

CREATE POLICY contribution_extensions_select_at_scope ON finance.contribution_extensions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM finance.charges c
      WHERE c.id = charge_id
        AND (
          core.has_permission(auth.uid(), c.scope_id, 'treasury.read')
          OR core.has_permission(auth.uid(), c.scope_id, 'finance.read')
        )
    )
  );

-------------------------------------------------------------------------------
-- 3. Exceptions — scoped through charge
-------------------------------------------------------------------------------

CREATE POLICY exceptions_select_at_scope ON finance.exceptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM finance.charges c
      WHERE c.id = charge_id
        AND (
          core.has_permission(auth.uid(), c.scope_id, 'treasury.read')
          OR core.has_permission(auth.uid(), c.scope_id, 'finance.read')
        )
    )
  );

-------------------------------------------------------------------------------
-- 4. Obligations — scoped SELECT + a member can see their own
-------------------------------------------------------------------------------
-- Two SELECT paths:
--   A. treasury.read / finance.read at the obligation's scope (admin lens).
--   B. The member themselves — spec Part XIII "member statement" requires
--      the member sees their own obligations. Resolved via the account
--      link (core.member_accounts.auth_user_id).

CREATE POLICY obligations_select_at_scope ON finance.obligations
  FOR SELECT TO authenticated
  USING (
    core.has_permission(auth.uid(), scope_id, 'treasury.read')
    OR core.has_permission(auth.uid(), scope_id, 'finance.read')
  );

CREATE POLICY obligations_select_own ON finance.obligations
  FOR SELECT TO authenticated
  USING (
    party_type = 'member'
    AND EXISTS (
      SELECT 1 FROM core.member_accounts ma
      WHERE ma.member_id = party_id
        AND ma.auth_user_id = auth.uid()
    )
  );

-------------------------------------------------------------------------------
-- 5. Payments — scoped SELECT + payer sees their own
-------------------------------------------------------------------------------

CREATE POLICY payments_select_at_scope ON finance.payments
  FOR SELECT TO authenticated
  USING (
    core.has_permission(auth.uid(), scope_id, 'treasury.read')
    OR core.has_permission(auth.uid(), scope_id, 'finance.read')
  );

CREATE POLICY payments_select_own ON finance.payments
  FOR SELECT TO authenticated
  USING (
    payer_member_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM core.member_accounts ma
      WHERE ma.member_id = payer_member_id
        AND ma.auth_user_id = auth.uid()
    )
  );

-------------------------------------------------------------------------------
-- 6. Tickets — scoped through charge + buyer sees own
-------------------------------------------------------------------------------

CREATE POLICY tickets_select_at_scope ON finance.tickets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM finance.charges c
      WHERE c.id = charge_id
        AND (
          core.has_permission(auth.uid(), c.scope_id, 'treasury.read')
          OR core.has_permission(auth.uid(), c.scope_id, 'finance.read')
        )
    )
  );

CREATE POLICY tickets_select_own ON finance.tickets
  FOR SELECT TO authenticated
  USING (
    buyer_member_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM core.member_accounts ma
      WHERE ma.member_id = buyer_member_id
        AND ma.auth_user_id = auth.uid()
    )
  );

-------------------------------------------------------------------------------
-- 7. Ledger entries — treasury.read only
-------------------------------------------------------------------------------
-- The ledger is the engine's private layer — surfaced to users only as
-- Treasury Statement (an aggregate view derived from these rows). So
-- SELECT is gated on treasury.read; there's no "member sees their own
-- ledger entry" path.

CREATE POLICY ledger_entries_select_at_scope ON finance.ledger_entries
  FOR SELECT TO authenticated
  USING (
    core.has_permission(auth.uid(), scope_id, 'treasury.read')
    OR core.has_permission(auth.uid(), scope_id, 'finance.read')
  );

-------------------------------------------------------------------------------
-- 8. Treasury balances — treasury.read
-------------------------------------------------------------------------------

CREATE POLICY treasury_balances_select_at_scope ON finance.treasury_balances
  FOR SELECT TO authenticated
  USING (
    core.has_permission(auth.uid(), scope_id, 'treasury.read')
    OR core.has_permission(auth.uid(), scope_id, 'finance.read')
  );

-------------------------------------------------------------------------------
-- 9. Expenses + expense_settings — treasury.read
-------------------------------------------------------------------------------

CREATE POLICY expenses_select_at_scope ON finance.expenses
  FOR SELECT TO authenticated
  USING (
    core.has_permission(auth.uid(), scope_id, 'treasury.read')
    OR core.has_permission(auth.uid(), scope_id, 'finance.read')
  );

CREATE POLICY expense_settings_select_at_scope ON finance.expense_settings
  FOR SELECT TO authenticated
  USING (
    core.has_permission(auth.uid(), scope_id, 'treasury.read')
    OR core.has_permission(auth.uid(), scope_id, 'finance.read')
  );

-- expense_settings.manage holders can INSERT/UPDATE the threshold row
-- for their scope. Since the row is a per-scope singleton (scope_id is
-- PK), UPDATE via UPSERT is the write path.

CREATE POLICY expense_settings_insert_admin ON finance.expense_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    core.has_permission(auth.uid(), scope_id, 'expense_settings.manage')
  );

CREATE POLICY expense_settings_update_admin ON finance.expense_settings
  FOR UPDATE TO authenticated
  USING (
    core.has_permission(auth.uid(), scope_id, 'expense_settings.manage')
  )
  WITH CHECK (
    core.has_permission(auth.uid(), scope_id, 'expense_settings.manage')
  );

-------------------------------------------------------------------------------
-- 10. Receipt verifications — authenticated only in M1
-------------------------------------------------------------------------------
-- Direct SELECT for authenticated (holders of treasury.read see them as
-- part of receipt lookups); anon reaches the minimal-disclosure verify
-- payload via a SECURITY DEFINER RPC that lands with M5. That RPC will
-- bypass RLS by design and return only {receipt_number, amount, date,
-- charge_name, valid} — never the member's full history.

CREATE POLICY receipt_verifications_select_authenticated ON finance.receipt_verifications
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM finance.payments p
      WHERE p.id = payment_id
        AND (
          core.has_permission(auth.uid(), p.scope_id, 'treasury.read')
          OR core.has_permission(auth.uid(), p.scope_id, 'finance.read')
        )
    )
  );

-------------------------------------------------------------------------------
-- 11. Explicit no-UPDATE / no-DELETE guarantee
-------------------------------------------------------------------------------
-- No policy for UPDATE or DELETE on payments / ledger_entries /
-- obligations / expenses / treasury_balances = default deny for
-- authenticated. Combined with the immutability triggers from the
-- previous migration, this is belt + suspenders:
--   * RLS says: authenticated can't UPDATE/DELETE these tables.
--   * Trigger says: ANY caller (even service_role) that tries to
--     UPDATE/DELETE raises 42501.
-- Service_role bypasses RLS by default but the trigger catches it.
-- So the immutability property holds even against a compromised
-- service key.
