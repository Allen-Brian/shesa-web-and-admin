-- Migration: rls_audit
--
-- RLS policies for audit.audit_entries. Reads go through a
-- permission-aware gate (audit.read at the entry's scope); direct
-- INSERTs are denied entirely. The only write path is the SECURITY
-- DEFINER helper audit.log_event() from E4, which runs as owner and
-- bypasses RLS — that single funnel is what lets us guarantee every
-- written entry passed through the canonical helper.

-------------------------------------------------------------------------------
-- 1. SELECT policy — gated on audit.read at the entry's scope
-------------------------------------------------------------------------------
-- Entries with a scope_id are visible to anyone holding audit.read at
-- that scope (or any ancestor — has_permission walks the tree).
--
-- Entries with scope_id IS NULL are SYSTEM events not tied to a
-- specific Branch / Chapter — auth.login, password resets, system jobs.
-- These are visible only to service_role (Server Action / Edge Function
-- callers acting on behalf of system tooling). Authenticated users
-- never see system events through this policy.

CREATE POLICY audit_entries_select ON audit.audit_entries
  FOR SELECT TO authenticated
  USING (
    scope_id IS NOT NULL
    AND core.has_permission(auth.uid(), scope_id, 'audit.read')
  );

-- service_role bypasses RLS entirely (Supabase grants BYPASSRLS to
-- service_role), so system-event reads from Server Actions using the
-- service-role client work without a separate policy.

-------------------------------------------------------------------------------
-- 2. INSERT policy — direct INSERT denied
-------------------------------------------------------------------------------
-- WITH CHECK (false) means no row INSERTed by an authenticated client
-- will pass the policy. The SECURITY DEFINER helper audit.log_event()
-- inserts as its OWNER (postgres), which bypasses RLS. So:
--
--   * Apps call audit.log_event(...)              → succeeds (bypasses RLS)
--   * Apps INSERT INTO audit.audit_entries direct → fails
--
-- That's the property — every entry has flowed through the helper, so
-- every entry has a captured auth.uid() actor and went through the
-- helper's validation (action / entity_schema / entity_table required).

CREATE POLICY audit_entries_insert_via_helper_only ON audit.audit_entries
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- No UPDATE / DELETE policies — those are blocked at the trigger level
-- in E4 (audit_entries_block_mutation raises 42501). RLS would deny
-- them anyway via default-deny, but the trigger is the load-bearing
-- layer because it catches the postgres-role case too.
