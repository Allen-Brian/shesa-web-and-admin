-- Migration: notifications_queue_wrappers
--
-- Repairs the notification pipeline, which has never worked.
--
-- ─── The bug ────────────────────────────────────────────────────────
-- All four notification Edge Functions reach pgmq like this:
--
--   supabase.rpc('pgmq.read', { queue_name, vt, qty })
--
-- PostgREST reads that as a function *literally named* `pgmq.read` in
-- the `public` schema — not `read` in the `pgmq` schema. Every call has
-- always failed with:
--
--   Could not find the function public.pgmq.read(qty, queue_name, vt)
--   in the schema cache
--
-- The same mistake was found and fixed in _shared/policy.ts, whose
-- comment explains that PostgREST resolves against `public` without an
-- explicit schema hint. It was never fixed here.
--
-- It went unnoticed because enqueue-notification CATCHES the queue
-- failure, logs it, and returns 200 — on the stated reasoning that "the
-- dispatcher's backstop sweep handles this". No such sweep exists. So
-- every notification event row was written, no message was ever queued,
-- nothing was ever delivered, and every caller saw success.
--
-- ─── Why wrappers rather than exposing pgmq ─────────────────────────
-- `.schema('pgmq')` would not have worked either: pgmq is not in the
-- PostgREST exposed-schema list. Adding it would put every queue
-- operation — read, send, delete, purge, drop, and the queue tables
-- themselves — on the public Data API, gated only by grants. These three
-- SECURITY DEFINER wrappers keep pgmq unexposed and give service_role a
-- narrow, named surface instead.
--
-- The queue name is validated against the four known queues rather than
-- passed through, so a wrapper cannot be turned into a general-purpose
-- handle on any queue that happens to exist.

BEGIN;

-------------------------------------------------------------------------------
-- Guard: pgmq may not be installed (it is skipped on projects where the
-- extension is not allowlisted). Create the wrappers only if it is.
-------------------------------------------------------------------------------

DO $outer$
BEGIN

IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgmq') THEN
  RAISE NOTICE 'pgmq not installed; skipping notification queue wrappers.';
  RETURN;
END IF;

-------------------------------------------------------------------------------
-- 1. queue_send
-------------------------------------------------------------------------------

EXECUTE $fn$
CREATE OR REPLACE FUNCTION notifications.queue_send(
  p_queue   TEXT,
  p_message JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pgmq, notifications, public
AS $body$
DECLARE
  v_msg_id BIGINT;
BEGIN
  IF p_queue NOT IN ('notification_dispatch', 'email_send', 'sms_send', 'audit_background') THEN
    RAISE EXCEPTION 'unknown queue %', p_queue USING ERRCODE = '22023';
  END IF;

  SELECT msg_id INTO v_msg_id FROM pgmq.send(p_queue, p_message) AS t(msg_id);
  RETURN v_msg_id;
END;
$body$;
$fn$;

-------------------------------------------------------------------------------
-- 2. queue_read
-------------------------------------------------------------------------------
-- Returns only what the consumers use: the id to ack with, and the body.
-- read_ct / vt / headers stay inside the database.

EXECUTE $fn$
CREATE OR REPLACE FUNCTION notifications.queue_read(
  p_queue TEXT,
  p_vt    INTEGER,
  p_qty   INTEGER
)
RETURNS TABLE (msg_id BIGINT, message JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pgmq, notifications, public
AS $body$
BEGIN
  IF p_queue NOT IN ('notification_dispatch', 'email_send', 'sms_send', 'audit_background') THEN
    RAISE EXCEPTION 'unknown queue %', p_queue USING ERRCODE = '22023';
  END IF;
  IF p_vt IS NULL OR p_vt < 1 OR p_vt > 3600 THEN
    RAISE EXCEPTION 'visibility timeout out of range' USING ERRCODE = '22023';
  END IF;
  IF p_qty IS NULL OR p_qty < 1 OR p_qty > 100 THEN
    RAISE EXCEPTION 'qty out of range' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT r.msg_id, r.message FROM pgmq.read(p_queue, p_vt, p_qty) AS r;
END;
$body$;
$fn$;

-------------------------------------------------------------------------------
-- 3. queue_delete — the ack
-------------------------------------------------------------------------------

EXECUTE $fn$
CREATE OR REPLACE FUNCTION notifications.queue_delete(
  p_queue  TEXT,
  p_msg_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pgmq, notifications, public
AS $body$
DECLARE
  v_ok BOOLEAN;
BEGIN
  IF p_queue NOT IN ('notification_dispatch', 'email_send', 'sms_send', 'audit_background') THEN
    RAISE EXCEPTION 'unknown queue %', p_queue USING ERRCODE = '22023';
  END IF;

  SELECT pgmq.delete(p_queue, p_msg_id) INTO v_ok;
  RETURN COALESCE(v_ok, FALSE);
END;
$body$;
$fn$;

-------------------------------------------------------------------------------
-- 4. requeue_stranded_events — the backstop that was only ever a comment
-------------------------------------------------------------------------------
-- enqueue-notification tolerates a failed queue write on the stated
-- basis that a sweep re-enqueues stranded events. Nothing implemented
-- that. This does: any event still 'pending' after the grace period gets
-- another message on notification_dispatch. Idempotent in effect — a
-- duplicate dispatch is harmless because every delivery row carries a
-- UNIQUE idempotency_key and the per-channel senders dedupe on it.

EXECUTE $fn$
CREATE OR REPLACE FUNCTION notifications.requeue_stranded_events(
  p_older_than_seconds INTEGER DEFAULT 300,
  p_limit              INTEGER DEFAULT 100
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pgmq, notifications, public
AS $body$
DECLARE
  v_event  RECORD;
  v_count  INTEGER := 0;
BEGIN
  FOR v_event IN
    SELECT id FROM notifications.notification_events
     WHERE status = 'pending'
       AND created_at < NOW() - make_interval(secs => p_older_than_seconds)
     ORDER BY created_at
     LIMIT p_limit
  LOOP
    PERFORM pgmq.send('notification_dispatch', jsonb_build_object('eventId', v_event.id));
    UPDATE notifications.notification_events SET status = 'queued' WHERE id = v_event.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$body$;
$fn$;

-------------------------------------------------------------------------------
-- 5. Grants — service_role only
-------------------------------------------------------------------------------
-- These are the queue. Nothing user-facing has any business calling them,
-- and the Edge Functions that do already run on the service-role client
-- behind the NOTIFICATIONS_WORKER_SECRET gate.

EXECUTE 'REVOKE ALL ON FUNCTION notifications.queue_send(TEXT, JSONB) FROM PUBLIC';
EXECUTE 'REVOKE ALL ON FUNCTION notifications.queue_read(TEXT, INTEGER, INTEGER) FROM PUBLIC';
EXECUTE 'REVOKE ALL ON FUNCTION notifications.queue_delete(TEXT, BIGINT) FROM PUBLIC';
EXECUTE 'REVOKE ALL ON FUNCTION notifications.requeue_stranded_events(INTEGER, INTEGER) FROM PUBLIC';

EXECUTE 'GRANT EXECUTE ON FUNCTION notifications.queue_send(TEXT, JSONB) TO service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION notifications.queue_read(TEXT, INTEGER, INTEGER) TO service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION notifications.queue_delete(TEXT, BIGINT) TO service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION notifications.requeue_stranded_events(INTEGER, INTEGER) TO service_role';

EXECUTE $c$
COMMENT ON FUNCTION notifications.queue_send IS
  'SECURITY DEFINER wrapper over pgmq.send. Exists so the pgmq schema need not be exposed through PostgREST — see the migration header. service_role only.'
$c$;

END
$outer$;

COMMIT;
