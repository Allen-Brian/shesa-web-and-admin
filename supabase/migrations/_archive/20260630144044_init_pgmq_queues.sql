-- Migration: init_pgmq_queues
--
-- Installs the pgmq extension (Supabase's queue-on-Postgres add-on) and
-- creates the four queues Phase 0 dispatches through:
--
--   notification_dispatch  — every notification event lands here first;
--                            the dispatch-notifications Edge Function
--                            (E8) reads and fans out by channel.
--   email_send             — per-event email delivery work for the
--                            send-email Edge Function (Resend).
--   sms_send               — per-event SMS delivery work for the
--                            send-sms-stub Edge Function in Phase 0
--                            (real provider lands in Phase 6).
--   audit_background       — deferred audit work that doesn't need to
--                            block the writing transaction (large
--                            payload mirrors, etc.).
--
-- DEVIATION FROM SPEC: the Phase 0 spec calls the third queue
-- `sms_send_stub`. We use `sms_send` here — the "stub" is the consumer
-- (the Edge Function in Phase 0), not the transport. Naming a queue
-- after its current implementation locks us into a rename when SMS
-- goes live for real. The queue stays `sms_send`; only the Edge
-- Function name (`send-sms-stub` → `send-sms`) changes.
--
-- Locked down to service_role only. The Edge Functions in E8 use the
-- service-role client to enqueue and the dispatcher consumes from the
-- same. authenticated never touches queues directly — Server Actions
-- and Edge Functions are the funnel.

-------------------------------------------------------------------------------
-- 1. Extension
-------------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgmq;

-- pgmq creates its functions in the `pgmq` schema. Default grants
-- include PUBLIC for some functions; we lock that down before creating
-- queues so the queue tables inherit the right ownership.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pgmq FROM PUBLIC;

-------------------------------------------------------------------------------
-- 2. Queues
-------------------------------------------------------------------------------
-- pgmq.create(<name>) creates an unlogged queue with default settings.
-- For Phase 0 (and most of Phase 6 too) the defaults are appropriate:
--   - Standard (non-partitioned) — fits comfortably under any volume
--     we expect before adding the worker container in Tier B.
--   - 30-day archive retention (default) — long enough for debugging
--     a delivery failure post-hoc.

SELECT pgmq.create('notification_dispatch');
SELECT pgmq.create('email_send');
SELECT pgmq.create('sms_send');
SELECT pgmq.create('audit_background');

-------------------------------------------------------------------------------
-- 3. Grants — service_role only
-------------------------------------------------------------------------------
-- Re-issue GRANT on the pgmq function set to service_role specifically.
-- authenticated and anon must never enqueue/dequeue directly — they go
-- through Edge Functions which use the service-role client.
--
-- ALL FUNCTIONS picks up both the pgmq core API (send, read, delete,
-- archive, pop, etc.) AND the per-queue helper functions pgmq adds
-- when you call pgmq.create(...).

GRANT USAGE ON SCHEMA pgmq TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO service_role;

-- The pgmq queue TABLES themselves (pgmq.q_<name>, pgmq.a_<name>) also
-- need privileges if service_role ever reads them outside the helper
-- API. Grant SELECT for inspection; mutations go via helpers.
GRANT SELECT ON ALL TABLES IN SCHEMA pgmq TO service_role;
