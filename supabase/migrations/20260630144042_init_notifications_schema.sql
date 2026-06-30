-- Migration: init_notifications_schema
--
-- Creates the `notifications` schema and the two tables Phase 0 needs:
--
--   notifications.notification_events     — "we want to notify X about Y"
--   notifications.notification_deliveries — per-channel attempt records
--
-- Per the schemas-per-phase rule, `notification_templates` is NOT
-- created here — Phase 0's Edge Functions send via Resend with inline
-- content. Templates land in Phase 6 (Notification Engine) when there's
-- actually a templating system that consumes them.
--
-- The two-table split mirrors the spec §12 model:
--   * An event is the INTENT (one row per "we want to notify").
--   * Deliveries are the ATTEMPTS (multiple rows per event, one per
--     channel × retry — `notification_dispatch` fans out into per-channel
--     queues, each producing one delivery row).
--
-- The idempotency_key on deliveries is what makes retries safe — the
-- Edge Function `send-email` (E8) attempts an INSERT ... ON CONFLICT
-- (idempotency_key) DO NOTHING; if the row already exists, the previous
-- send is acknowledged without re-invoking Resend. Pattern locked by
-- the plan's E8 spec.
--
-- RLS: recipients see their own events/deliveries; audit.read holders
-- at the event's scope see all in their scope. The 2-layer model from
-- ADR-0006 is the same as core RLS — RLS is the primary line, the
-- Edge Functions in E8 will add policy + envelope as the second.

-------------------------------------------------------------------------------
-- 1. Schema
-------------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS notifications;

COMMENT ON SCHEMA notifications IS
  'Outbound notification events + delivery attempts. Owned by Phase 0 (E6). Templates table deferred to Phase 6.';

-------------------------------------------------------------------------------
-- 2. notification_events — the INTENT
-------------------------------------------------------------------------------

CREATE TABLE notifications.notification_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- A dotted, past-tense event key. Examples: 'payment.confirmed',
  -- 'role.granted', 'arrears.reminder'. Free TEXT so adding a new
  -- event in a future phase doesn't need a schema change.
  event_type          TEXT NOT NULL,

  -- Triage class — drives quiet-hours respect + batching policy in
  -- Phase 6's notification engine.
  severity            TEXT NOT NULL
                      CHECK (severity IN ('critical', 'important', 'info')),

  -- Recipient: either a Shesa user (has auth.users row) OR a target
  -- email/phone (for invitations sent to non-claimed accounts). At
  -- least one must be set — enforced by the CHECK below.
  recipient_user_id   UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email     TEXT NULL,
  recipient_phone     TEXT NULL,

  -- Scope context. Optional — auth.login and similar global events
  -- have NULL scope (visible only to service_role per RLS).
  scope_id            UUID NULL REFERENCES core.scopes(id) ON DELETE SET NULL,

  -- Action-specific data. Stays JSONB so adding fields per event_type
  -- never requires a schema migration.
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Lifecycle:
  --   pending    — created, not yet enqueued (transient — typically
  --                only seen by the writing transaction)
  --   queued     — sent to the notification_dispatch pgmq queue
  --   completed  — all deliveries succeeded
  --   failed     — at least one critical delivery failed terminally
  --   cancelled  — explicitly cancelled before dispatch
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'queued', 'completed', 'failed', 'cancelled')),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT notification_events_has_recipient CHECK (
    recipient_user_id IS NOT NULL OR recipient_email IS NOT NULL OR recipient_phone IS NOT NULL
  )
);

-- Hot query: "my notifications, newest first" — for a per-user inbox.
CREATE INDEX notification_events_recipient_idx
  ON notifications.notification_events (recipient_user_id, created_at DESC)
  WHERE recipient_user_id IS NOT NULL;

-- Hot query: "all events for this Branch" — for admin dashboards.
CREATE INDEX notification_events_scope_idx
  ON notifications.notification_events (scope_id, created_at DESC)
  WHERE scope_id IS NOT NULL;

-- Hot query: the dispatch worker scanning for pending/queued events.
CREATE INDEX notification_events_status_idx
  ON notifications.notification_events (status, created_at)
  WHERE status IN ('pending', 'queued');

COMMENT ON TABLE notifications.notification_events IS
  'The intent to notify. One row per "we want to notify someone". Dispatch fans out into notification_deliveries.';

ALTER TABLE notifications.notification_events ENABLE ROW LEVEL SECURITY;

-------------------------------------------------------------------------------
-- 3. notification_deliveries — the per-channel attempts
-------------------------------------------------------------------------------

CREATE TABLE notifications.notification_deliveries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  event_id            UUID NOT NULL
                      REFERENCES notifications.notification_events(id) ON DELETE CASCADE,

  channel             TEXT NOT NULL
                      CHECK (channel IN ('in_app', 'email', 'sms', 'push')),

  -- Free TEXT so adding new providers in later phases doesn't require
  -- a schema change. Phase 0 values: 'resend', 'stub', 'db'.
  provider            TEXT NOT NULL,

  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),

  -- Provider-side dedup key. The convention (locked by E8's send-email
  -- spec): '<event_id>:<channel>'. A retried enqueue produces the
  -- same key; INSERT ... ON CONFLICT (idempotency_key) DO NOTHING
  -- in the send function makes retries safe.
  idempotency_key     TEXT NOT NULL UNIQUE,

  attempt_count       INTEGER NOT NULL DEFAULT 0,
  last_attempt_at     TIMESTAMPTZ NULL,
  error_message       TEXT NULL,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notification_deliveries_event_idx
  ON notifications.notification_deliveries (event_id);

CREATE INDEX notification_deliveries_status_idx
  ON notifications.notification_deliveries (status, created_at)
  WHERE status IN ('pending', 'retrying');

-- Reuse the updated_at trigger from core (cross-schema function calls
-- are fine; the function is just an SQL function).
CREATE TRIGGER notification_deliveries_set_updated_at
  BEFORE UPDATE ON notifications.notification_deliveries
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMENT ON TABLE notifications.notification_deliveries IS
  'Per-channel delivery attempts for a notification_event. UNIQUE idempotency_key makes retries safe (INSERT ... ON CONFLICT DO NOTHING pattern).';

ALTER TABLE notifications.notification_deliveries ENABLE ROW LEVEL SECURITY;

-------------------------------------------------------------------------------
-- 4. Schema USAGE + table privileges
-------------------------------------------------------------------------------
-- Standard pattern: GRANT widely, RLS narrows. Same shape as the
-- grant_authenticated_access migration handled for core + audit.
-- No mutation grants for authenticated — writes go via SECURITY DEFINER
-- Edge Functions (E8) using the service-role client.

GRANT USAGE ON SCHEMA notifications
  TO authenticated, service_role;

GRANT SELECT ON TABLE notifications.notification_events
  TO authenticated, service_role;

GRANT SELECT ON TABLE notifications.notification_deliveries
  TO authenticated, service_role;

-- service_role needs full table access for the dispatcher / enqueue
-- helpers in E8. authenticated never mutates directly.
GRANT INSERT, UPDATE, DELETE ON TABLE notifications.notification_events
  TO service_role;

GRANT INSERT, UPDATE, DELETE ON TABLE notifications.notification_deliveries
  TO service_role;

-------------------------------------------------------------------------------
-- 5. RLS helper — resolves a delivery to its event's recipient/scope
-------------------------------------------------------------------------------
-- Same pattern as core.can_view_role_history. The delivery row doesn't
-- carry recipient/scope directly (the FK to events does), so the
-- policy needs a one-step resolution. SECURITY DEFINER so the
-- internal SELECT on notification_events isn't itself RLS-recursive.

CREATE OR REPLACE FUNCTION notifications.can_view_delivery(p_delivery_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, core, auth
STABLE
AS $$
DECLARE
  v_recipient_user_id UUID;
  v_scope_id          UUID;
BEGIN
  IF p_delivery_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT e.recipient_user_id, e.scope_id
    INTO v_recipient_user_id, v_scope_id
  FROM notifications.notification_events e
  INNER JOIN notifications.notification_deliveries d ON d.event_id = e.id
  WHERE d.id = p_delivery_id;

  RETURN v_recipient_user_id = auth.uid()
      OR (v_scope_id IS NOT NULL
          AND core.has_permission(auth.uid(), v_scope_id, 'audit.read'));
END;
$$;

REVOKE ALL ON FUNCTION notifications.can_view_delivery(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION notifications.can_view_delivery(UUID)
  TO authenticated, service_role;

COMMENT ON FUNCTION notifications.can_view_delivery IS
  'RLS helper for notification_deliveries SELECT. Resolves the delivery to its event and returns TRUE if the caller is the recipient OR has audit.read at the event scope.';

-------------------------------------------------------------------------------
-- 6. RLS policies
-------------------------------------------------------------------------------

-- notification_events: SELECT only for the recipient OR audit.read at
-- the event's scope. No INSERT/UPDATE/DELETE policy → only service_role
-- can mutate.
CREATE POLICY notification_events_select ON notifications.notification_events
  FOR SELECT TO authenticated
  USING (
    recipient_user_id = auth.uid()
    OR (scope_id IS NOT NULL
        AND core.has_permission(auth.uid(), scope_id, 'audit.read'))
  );

-- notification_deliveries: SELECT via the helper. No mutations from
-- authenticated.
CREATE POLICY notification_deliveries_select ON notifications.notification_deliveries
  FOR SELECT TO authenticated
  USING (notifications.can_view_delivery(id));
