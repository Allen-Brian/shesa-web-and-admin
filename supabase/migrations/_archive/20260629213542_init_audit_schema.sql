-- Migration: init_audit_schema
--
-- Creates the `audit` schema with the central append-only event log
-- (`audit.audit_entries`) plus the security-definer helper
-- (`audit.log_event`) that Server Actions, Edge Functions, and triggers
-- call to write events.
--
-- Per the Phase 0 planning decision (decision 3), audit is TWO LAYERS:
--   1. THIS file — the cross-cutting `audit.audit_entries` table holds
--      every auditable event (auth.login, role.granted, payment.recorded,
--      …) in one place.
--   2. Per-entity history tables (e.g. `core.role_history` — added in
--      the next migration) hold queryable timelines per record.
-- The two are linked: every per-entity history row references the
-- `audit.audit_entries.id` that created it, so timelines and event
-- log views are bridged.
--
-- Append-only: a trigger on `audit.audit_entries` raises on UPDATE or
-- DELETE. Plus REVOKE UPDATE/DELETE from anon and authenticated. The
-- only way to mutate the table is via the postgres role from a manual
-- ops session — and even then the trigger blocks it. Append-only is the
-- security property that makes audit meaningful: a compromised user
-- can't cover their tracks.

-------------------------------------------------------------------------------
-- 1. Schema
-------------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS audit;
COMMENT ON SCHEMA audit IS
  'Cross-cutting append-only event log. Owned by Phase 0 (E4). Per-entity history tables live in their owning schemas (e.g. core.role_history) and reference audit_entries.';

-------------------------------------------------------------------------------
-- 2. Table: audit.audit_entries
-------------------------------------------------------------------------------
-- Columns per spec §11. `actor_user_id` is the JWT-resolved auth.uid()
-- at write time; NULL when the action originated outside an authenticated
-- session (system jobs, public webhooks). `metadata` is a free-form
-- JSONB bag for action-specific payload (the action key is stable;
-- structured details vary per action).

CREATE TABLE audit.audit_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_user_id   UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,

  -- Pointer to the entity the action affected. Free-text schema/table
  -- so this works for any future schema without a migration. entity_id
  -- nullable because some events (auth.login) aren't tied to a row.
  entity_schema   TEXT NOT NULL,
  entity_table    TEXT NOT NULL,
  entity_id       UUID NULL,

  -- Scope context — for "everything that happened at Branch X" queries.
  scope_id        UUID NULL REFERENCES core.scopes(id) ON DELETE SET NULL,

  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Network context — captured by Server Actions / Edge Functions when
  -- handling an authenticated HTTP request; NULL when written from
  -- a database trigger.
  ip_address      INET NULL,
  user_agent      TEXT NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- "Everything for this user", "everything at this scope", "everything
-- of this action type" — the three hottest query shapes for audit
-- reads. Composite indexes serve each cheaply.
CREATE INDEX audit_entries_actor_user_id_idx
  ON audit.audit_entries (actor_user_id, created_at DESC);

CREATE INDEX audit_entries_scope_id_idx
  ON audit.audit_entries (scope_id, created_at DESC);

CREATE INDEX audit_entries_action_idx
  ON audit.audit_entries (action, created_at DESC);

-- Per-entity reverse lookup ("what audit events touched this row?")
CREATE INDEX audit_entries_entity_idx
  ON audit.audit_entries (entity_schema, entity_table, entity_id);

COMMENT ON TABLE audit.audit_entries IS
  'Append-only event log. Written by audit.log_event(). UPDATE and DELETE are blocked by trigger + role grants.';

-------------------------------------------------------------------------------
-- 3. Append-only enforcement
-------------------------------------------------------------------------------
-- Belt + suspenders:
--   1. Trigger raises on UPDATE/DELETE so even the postgres role can't
--      silently mutate history.
--   2. REVOKE UPDATE/DELETE from anon + authenticated so even if a
--      future RLS policy is written wrong, the role can't do it.

CREATE OR REPLACE FUNCTION audit.audit_entries_block_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit.audit_entries is append-only (% blocked)', TG_OP
    USING ERRCODE = '42501',
          HINT = 'Audit entries cannot be modified or deleted. Add a new entry instead.';
END;
$$;

CREATE TRIGGER audit_entries_block_update
  BEFORE UPDATE ON audit.audit_entries
  FOR EACH ROW EXECUTE FUNCTION audit.audit_entries_block_mutation();

CREATE TRIGGER audit_entries_block_delete
  BEFORE DELETE ON audit.audit_entries
  FOR EACH ROW EXECUTE FUNCTION audit.audit_entries_block_mutation();

-- RLS enabled (defense-in-depth; policies in E5 grant read to
-- holders of audit.read and INSERT only via the helper function).
ALTER TABLE audit.audit_entries ENABLE ROW LEVEL SECURITY;

-- Explicit role-level grants. INSERT for everyone (the helper writes
-- in callers' contexts); SELECT for everyone (RLS will filter); never
-- UPDATE/DELETE for authenticated/anon.
REVOKE ALL ON TABLE audit.audit_entries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE audit.audit_entries TO authenticated, service_role;

-------------------------------------------------------------------------------
-- 4. audit.log_event — the canonical write path
-------------------------------------------------------------------------------
-- Every caller (Server Actions, Edge Functions, triggers, scheduled
-- jobs) writes via this function rather than INSERTing directly. That
-- gives us:
--   - A single place to add cross-cutting concerns later (rate limiting,
--     redaction, structured-logging mirror).
--   - JWT-context capture of actor_user_id automatically — callers don't
--     have to remember to pass it.
--   - SECURITY DEFINER so the RLS INSERT policy doesn't need to grant
--     to authenticated explicitly (the function runs as owner, RLS
--     bypassed for the write).

CREATE OR REPLACE FUNCTION audit.log_event(
  p_action        TEXT,
  p_entity_schema TEXT,
  p_entity_table  TEXT,
  p_entity_id     UUID    DEFAULT NULL,
  p_scope_id      UUID    DEFAULT NULL,
  p_metadata      JSONB   DEFAULT '{}'::jsonb,
  p_ip_address    INET    DEFAULT NULL,
  p_user_agent    TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  IF p_action IS NULL OR p_entity_schema IS NULL OR p_entity_table IS NULL THEN
    RAISE EXCEPTION 'log_event: action, entity_schema, entity_table are required'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO audit.audit_entries (
    actor_user_id, action,
    entity_schema, entity_table, entity_id,
    scope_id, metadata,
    ip_address, user_agent
  )
  VALUES (
    auth.uid(),  -- NULL when no JWT context (system jobs); captured otherwise
    p_action,
    p_entity_schema, p_entity_table, p_entity_id,
    p_scope_id, COALESCE(p_metadata, '{}'::jsonb),
    p_ip_address, p_user_agent
  )
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

COMMENT ON FUNCTION audit.log_event IS
  'Canonical write path for audit entries. SECURITY DEFINER so callers do not need direct INSERT on audit.audit_entries. Captures actor_user_id from JWT context automatically.';

-- Grant EXECUTE to authenticated + service_role so apps and Edge
-- Functions can call it. PUBLIC + anon get nothing.
REVOKE ALL ON FUNCTION audit.log_event(TEXT, TEXT, TEXT, UUID, UUID, JSONB, INET, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION audit.log_event(TEXT, TEXT, TEXT, UUID, UUID, JSONB, INET, TEXT)
  TO authenticated, service_role;
