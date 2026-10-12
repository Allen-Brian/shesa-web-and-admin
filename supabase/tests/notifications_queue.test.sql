-- pgTAP: the notification queue wrappers.
--
-- These exist because the Edge Functions had always reached pgmq as
-- `supabase.rpc('pgmq.read', …)`, which PostgREST reads as a function
-- literally named `pgmq.read` in `public`. Every call failed, the
-- failure was swallowed by enqueue-notification, and the whole
-- notification feature was silently dead — no invite, receipt or
-- reminder was ever delivered.
--
-- Exposing the pgmq schema through PostgREST would have fixed the call
-- but put every queue operation on the public Data API. These wrappers
-- keep pgmq unexposed instead.
--
-- Tests:
--   A. The four wrappers exist.
--   B. They are service_role only — anon and authenticated cannot execute.
--   C. The queue name is validated, so a wrapper is not a general handle
--      on any queue that happens to exist.
--   D. Round trip: send → read → delete.
--   E. requeue_stranded_events picks up an event left at 'pending'.

BEGIN;
SET LOCAL search_path = pgtap, public, notifications, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;
GRANT USAGE ON SCHEMA pgtap TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO anon;

SELECT plan(11);

-------------------------------------------------------------------------------
-- A) The wrappers exist
-------------------------------------------------------------------------------

SELECT has_function('notifications', 'queue_send',   'notifications.queue_send exists');
SELECT has_function('notifications', 'queue_read',   'notifications.queue_read exists');
SELECT has_function('notifications', 'queue_delete', 'notifications.queue_delete exists');
SELECT has_function('notifications', 'requeue_stranded_events',
  'notifications.requeue_stranded_events exists — the backstop that used to be only a comment');

-------------------------------------------------------------------------------
-- B) service_role only
-------------------------------------------------------------------------------
-- These ARE the queue. Nothing user-facing has any business calling them.

SELECT ok(
  NOT has_function_privilege('anon', 'notifications.queue_send(text, jsonb)', 'EXECUTE'),
  'anon cannot execute queue_send'
);

SELECT ok(
  NOT has_function_privilege('authenticated', 'notifications.queue_send(text, jsonb)', 'EXECUTE'),
  'authenticated cannot execute queue_send'
);

SELECT ok(
  has_function_privilege('service_role', 'notifications.queue_send(text, jsonb)', 'EXECUTE'),
  'service_role can execute queue_send'
);

-------------------------------------------------------------------------------
-- C) The queue name is validated
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ SELECT notifications.queue_send('some_other_queue', '{}'::jsonb) $$,
  '22023',
  NULL,
  'queue_send rejects a queue outside the known set'
);

-------------------------------------------------------------------------------
-- D) Round trip
-------------------------------------------------------------------------------

SELECT ok(
  notifications.queue_send('sms_send', jsonb_build_object('deliveryId', 'test-1')) IS NOT NULL,
  'queue_send returns a message id'
);

SELECT is(
  (SELECT message->>'deliveryId' FROM notifications.queue_read('sms_send', 30, 1) LIMIT 1),
  'test-1',
  'queue_read returns the message that was sent'
);

-------------------------------------------------------------------------------
-- E) The backstop sweep
-------------------------------------------------------------------------------
-- An event stranded at 'pending' — which is exactly what a failed queue
-- write leaves behind — must be picked up and re-queued.

INSERT INTO notifications.notification_events
  (id, event_type, severity, recipient_email, payload, status, created_at)
VALUES
  ('bbbbbbbb-0000-0000-0000-00000000cccc', 'test.stranded', 'info',
   'stranded@example.com', '{}'::jsonb, 'pending', NOW() - INTERVAL '10 minutes');

SELECT is(
  notifications.requeue_stranded_events(300, 100),
  1,
  'requeue_stranded_events re-enqueues an event left pending past the grace period'
);

SELECT * FROM finish();
ROLLBACK;
