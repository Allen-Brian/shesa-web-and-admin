-- Migration: finance_charges_visible_via_obligation
--
-- The `finance.obligations` SELECT policies let a body's admin see every
-- obligation landing on their scope (party_type='branch' owed by their
-- branch, or party_type='member' when the member belongs to them). But
-- the parent `finance.charges` row is scoped to the CREATOR — usually
-- Mainstream when the charge levies a branch — and its own SELECT
-- policy only admits callers with `treasury.read` / `finance.read` at
-- THAT creator scope.
--
-- Result: a branch admin loading their Obligations page could read the
-- obligation row but the join to `finance.charges` returned empty, so
-- the charge name + recurrence rendered as "—". Every UI that joins
-- obligation → charge (Obligations page, per-charge detail, upcoming
-- reports) hit the same hole.
--
-- Fix: add a SECOND SELECT policy on `finance.charges` — a caller can
-- read a charge if they can see AT LEAST ONE of its obligations. That
-- doesn't widen the envelope: the caller already had access to the
-- obligation row via the existing obligations policies; this just
-- exposes the charge metadata (name, recurrence, category) they need
-- to render it. Multiple SELECT policies are OR'd by PostgreSQL, so
-- the original owner-scope policy still admits Mainstream / Finance
-- callers who created the charge.
--
-- The recursion trap: `obligations` doesn't reference `charges` in its
-- own RLS (its SELECT policies key off obligation.scope_id + the
-- member-account link), so this policy can't loop back on itself.

CREATE POLICY charges_select_via_obligation ON finance.charges
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM finance.obligations o
      WHERE o.charge_id = finance.charges.id
        AND (
          core.has_permission(auth.uid(), o.scope_id, 'treasury.read')
          OR core.has_permission(auth.uid(), o.scope_id, 'finance.read')
        )
    )
  );

COMMENT ON POLICY charges_select_via_obligation ON finance.charges IS
  'Second SELECT policy — a caller can read a charge if they can already see one of its obligations. Restores the join needed by the branch-scoped Obligations page without widening the security envelope.';
