-- Migration: audit_role_assignments
--
-- Adds the per-entity history table for role assignments
-- (`core.role_history`) and a trigger on `core.role_assignments` that
-- mirrors every grant/revoke/modification to BOTH:
--
--   1. The central `audit.audit_entries` log (via audit.log_event)
--   2. The per-entity `core.role_history` (via direct insert in the
--      same trigger; the row links back to its audit_entry via FK)
--
-- This is the "both layers" pattern from the Phase 0 planning decision —
-- audit_entries holds the cross-cutting log; role_history holds the
-- queryable timeline for a specific assignment. Following the
-- audit_entry_id from a history row gets you the full event context.
--
-- The trigger means callers — Server Actions, Edge Functions, even
-- manual ops sessions — cannot accidentally write a role_assignment
-- WITHOUT producing an audit record. That's the invariant we test in
-- supabase/tests/role_history_mirror.test.sql.

-------------------------------------------------------------------------------
-- 1. Table: core.role_history
-------------------------------------------------------------------------------

CREATE TABLE core.role_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  role_assignment_id  UUID NOT NULL REFERENCES core.role_assignments(id) ON DELETE CASCADE,

  -- What happened: granted | revoked | expired | modified
  -- 'expired' is set by the future cron job that flips expired
  -- assignments; not produced by user action.
  action              TEXT NOT NULL CHECK (action IN ('granted', 'revoked', 'expired', 'modified')),

  changed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by          UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Snapshot of the row state BEFORE the change. NULL for 'granted'
  -- (no prior state). JSONB so we don't have to chase schema changes
  -- in the audit table.
  prior_snapshot      JSONB NULL,

  -- Bridge to the central audit log. NULL is allowed for historical
  -- backfills, but the trigger always populates it for live writes.
  audit_entry_id      UUID NULL REFERENCES audit.audit_entries(id) ON DELETE SET NULL
);

CREATE INDEX role_history_role_assignment_id_idx
  ON core.role_history (role_assignment_id, changed_at DESC);

CREATE INDEX role_history_changed_by_idx
  ON core.role_history (changed_by, changed_at DESC);

COMMENT ON TABLE core.role_history IS
  'Per-record timeline for core.role_assignments. Append-only (UPDATE/DELETE blocked by trigger). Every row links to its audit.audit_entries event.';

-------------------------------------------------------------------------------
-- 2. Append-only enforcement (same pattern as audit_entries)
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.role_history_block_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'core.role_history is append-only (% blocked)', TG_OP
    USING ERRCODE = '42501',
          HINT = 'Role history is the audit trail for role assignments; entries cannot be modified or deleted.';
END;
$$;

CREATE TRIGGER role_history_block_update
  BEFORE UPDATE ON core.role_history
  FOR EACH ROW EXECUTE FUNCTION core.role_history_block_mutation();

CREATE TRIGGER role_history_block_delete
  BEFORE DELETE ON core.role_history
  FOR EACH ROW EXECUTE FUNCTION core.role_history_block_mutation();

ALTER TABLE core.role_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE core.role_history FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE core.role_history TO authenticated, service_role;

-------------------------------------------------------------------------------
-- 3. The mirror trigger on core.role_assignments
-------------------------------------------------------------------------------
-- Runs AFTER INSERT or UPDATE on role_assignments. For each event:
--   1. Determine the action ('granted' on insert; 'revoked' if
--      revoked_at flipped NULL → non-NULL; 'modified' for any other
--      UPDATE).
--   2. Call audit.log_event to write the central audit entry (returns
--      the new audit_entry id).
--   3. INSERT into core.role_history with the action, actor, and
--      audit_entry_id link.
--
-- SECURITY DEFINER + pinned search_path: same pattern as has_permission
-- in E3. The trigger writes into audit.audit_entries and
-- core.role_history bypassing RLS — both tables grant SELECT/INSERT
-- to authenticated, but the helper centralizes the writes so we never
-- depend on a caller's role having both grants.

CREATE OR REPLACE FUNCTION core.role_assignments_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, audit, auth
AS $$
DECLARE
  v_action          TEXT;
  v_actor           UUID;
  v_audit_entry_id  UUID;
  v_prior_snapshot  JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'granted';
    v_actor  := NEW.granted_by;
    v_prior_snapshot := NULL;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
      v_action := 'revoked';
      v_actor  := NEW.revoked_by;
    ELSIF OLD IS DISTINCT FROM NEW THEN
      v_action := 'modified';
      v_actor  := NEW.granted_by;  -- best-effort; modifications are rare
    ELSE
      -- No meaningful change (UPDATE that touched nothing). Skip the audit
      -- entry rather than spam the log with no-ops.
      RETURN NEW;
    END IF;
    v_prior_snapshot := to_jsonb(OLD);
  ELSE
    RETURN NEW; -- shouldn't reach (trigger only on INSERT/UPDATE)
  END IF;

  -- Write the central audit entry. Action key matches @shesa/types
  -- AuditAction literal: 'role.granted' / 'role.revoked' (no
  -- '.modified' in the type yet; if we start writing modifications
  -- meaningfully we'll add it. For now those use 'role.granted' since
  -- a modification is conceptually a re-grant.)
  v_audit_entry_id := audit.log_event(
    p_action        := CASE v_action
                         WHEN 'granted' THEN 'role.granted'
                         WHEN 'revoked' THEN 'role.revoked'
                         ELSE 'role.granted'
                       END,
    p_entity_schema := 'core',
    p_entity_table  := 'role_assignments',
    p_entity_id     := NEW.id,
    p_scope_id      := NEW.scope_id,
    p_metadata      := jsonb_build_object(
                         'role_id', NEW.role_id,
                         'user_id', NEW.user_id,
                         'history_action', v_action
                       )
  );

  -- Write the per-entity history row.
  INSERT INTO core.role_history (
    role_assignment_id, action, changed_by, prior_snapshot, audit_entry_id
  )
  VALUES (
    NEW.id, v_action, v_actor, v_prior_snapshot, v_audit_entry_id
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION core.role_assignments_audit_trigger IS
  'AFTER INSERT/UPDATE trigger on core.role_assignments. Writes to audit.audit_entries (central log) AND core.role_history (per-entity timeline) so callers cannot create or modify a role assignment without producing an audit trail.';

CREATE TRIGGER role_assignments_audit
  AFTER INSERT OR UPDATE ON core.role_assignments
  FOR EACH ROW EXECUTE FUNCTION core.role_assignments_audit_trigger();
