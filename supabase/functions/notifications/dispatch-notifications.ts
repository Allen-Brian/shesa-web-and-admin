/**
 * Edge Function: dispatch-notifications
 *
 * The pgmq consumer for `notification_dispatch`. Reads up to N pending
 * messages, for each one:
 *   1. Looks up the notification_event + its delivery rows.
 *   2. For each delivery, enqueues to the per-channel queue
 *      (email_send for email, sms_send for sms/push, none for in_app).
 *   3. Deletes the dispatch message (acks).
 *   4. Marks the event as 'completed' if all channels were routed.
 *
 * Called by pg_cron on a schedule (lands when the cron config is added
 * in a later phase) AND manually for tests. Always uses service-role
 * since pgmq is locked down to service_role per init_pgmq_queues.
 *
 * Idempotency: each delivery row has a UNIQUE idempotency_key, so even
 * if the dispatcher is invoked twice for the same event (cron overlap),
 * the per-channel send functions dedup on that key.
 *
 * For Phase 0 simplicity, this function does NOT call provider APIs
 * itself — it just routes work to the channel queues. The actual send
 * happens in send-email / send-sms-stub (E8f).
 */

import { z } from 'npm:zod@3.24.1';

import { withCors } from '../_shared/cors.ts';
import { internalError, success, unauthorized } from '../_shared/errors.ts';
import { buildContext } from '../_shared/request-context.ts';
import { checkWorkerSecret } from '../_shared/worker-auth.ts';
import { createServiceRoleClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

// Optional input: how many messages to drain in one invocation, and
// the visibility timeout (seconds) on read. The defaults are fine for
// typical cron-driven runs; manual invocations can tune.
const inputSchema = z
  .object({
    batchSize: z.number().int().min(1).max(100).default(10),
    visibilityTimeoutSec: z.number().int().min(5).max(600).default(30),
  })
  .strict()
  .default({ batchSize: 10, visibilityTimeoutSec: 30 });

interface DispatchMessage {
  msg_id: number;
  message: { eventId: string; traceId?: string };
}

interface SuccessBody {
  processed: number;
  failed: number;
  traceId: string;
}

interface DeliveryRow {
  id: string;
  channel: 'email' | 'sms' | 'in_app' | 'push';
  idempotency_key: string;
}

export async function dispatchNotifications(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  // ── Worker gate ────────────────────────────────────────────────────
  // This handler runs as service_role with no caller identity to check,
  // so `verify_jwt` is not a boundary — it accepts the public anon key.
  // Only the scheduler holding NOTIFICATIONS_WORKER_SECRET may drain the
  // queue. Without this, anyone could burn the Resend quota or hold every
  // queued message invisible under a long visibility timeout.
  const workerAuth = await checkWorkerSecret(req, 'NOTIFICATIONS_WORKER_SECRET');
  if (!workerAuth.ok) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        traceId: ctx.traceId,
        message: 'notifications: rejected unauthorized worker call',
        handler: 'dispatchNotifications',
        reason: workerAuth.reason,
      }),
    );
    return withCors(req, unauthorized(ctx.traceId));
  }

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);

  const supabase = createServiceRoleClient();
  const { batchSize, visibilityTimeoutSec } = parsed.data;

  // ── Backstop sweep ─────────────────────────────────────────────────
  // enqueue-notification tolerates a failed queue write and leaves the
  // event at 'pending' on the basis that this sweep picks it up. Run it
  // before draining so a recovered event joins the same batch. A
  // duplicate dispatch is harmless — every delivery row carries a UNIQUE
  // idempotency_key and the per-channel senders dedupe on it.
  const { data: requeued, error: sweepErr } = await supabase.schema('notifications' as never).rpc(
    'requeue_stranded_events' as never,
    {
      p_older_than_seconds: 300,
      p_limit: 100,
    } as never,
  );

  if (sweepErr) {
    // Non-fatal: the sweep is a repair path, not the main one. Draining
    // the queue is still worth doing.
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'dispatch-notifications: requeue_stranded_events failed',
        error: sweepErr.message,
      }),
    );
  } else if (typeof requeued === 'number' && requeued > 0) {
    console.info(
      JSON.stringify({
        level: 'info',
        traceId: ctx.traceId,
        message: 'dispatch-notifications: re-enqueued stranded events',
        count: requeued,
      }),
    );
  }

  // ── Read a batch from notification_dispatch ────────────────────────
  const { data: messages, error: readErr } = await supabase.schema('notifications' as never).rpc(
    'queue_read' as never,
    {
      p_queue: 'notification_dispatch',
      p_vt: visibilityTimeoutSec,
      p_qty: batchSize,
    } as never,
  );

  if (readErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'dispatch-notifications: queue_read failed',
        error: readErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const batch = (messages as DispatchMessage[] | null) ?? [];

  let processed = 0;
  let failed = 0;

  for (const msg of batch) {
    const eventId = msg.message?.eventId;
    if (!eventId) {
      // Malformed message — delete + skip so it doesn't loop forever.
      await ackMessage(supabase, msg.msg_id);
      failed++;
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'dispatch-notifications: malformed queue message (no eventId)',
          msgId: msg.msg_id,
        }),
      );
      continue;
    }

    const ok = await dispatchOne(supabase, ctx.traceId, eventId);
    if (ok) {
      await ackMessage(supabase, msg.msg_id);
      processed++;
    } else {
      // Don't ack: the visibility timeout will release the message back
      // to the queue for retry. After N retries pgmq sends it to the
      // dead-letter queue (configured at create time; default behavior).
      failed++;
    }
  }

  const body: SuccessBody = { processed, failed, traceId: ctx.traceId };
  return withCors(req, success(body));
}

/**
 * Fan out one event's deliveries to the per-channel queues.
 * Returns true on full success, false on any per-delivery failure
 * (in which case the dispatcher leaves the message for retry).
 */
async function dispatchOne(
  supabase: ReturnType<typeof createServiceRoleClient>,
  traceId: string,
  eventId: string,
): Promise<boolean> {
  const { data: deliveries, error } = await supabase
    .schema('notifications' as never)
    .from('notification_deliveries' as never)
    .select('id, channel, idempotency_key')
    .eq('event_id', eventId)
    .eq('status', 'pending');

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId,
        message: 'dispatch-notifications: deliveries lookup failed',
        eventId,
        error: error.message,
      }),
    );
    return false;
  }

  const rows = (deliveries as DeliveryRow[] | null) ?? [];
  if (rows.length === 0) {
    // Event had no pending deliveries — already processed. Treat as
    // success so we ack the queue message.
    return true;
  }

  let allOk = true;
  for (const d of rows) {
    const targetQueue = queueForChannel(d.channel);
    if (!targetQueue) {
      // in_app deliveries don't need a queue — the row IS the delivery.
      // Mark sent immediately.
      const { error: markErr } = await supabase
        .schema('notifications' as never)
        .from('notification_deliveries' as never)
        .update({ status: 'sent', last_attempt_at: new Date().toISOString() } as never)
        .eq('id', d.id);
      if (markErr) {
        allOk = false;
        console.error(
          JSON.stringify({
            level: 'error',
            traceId,
            message: 'dispatch-notifications: in_app mark-sent failed',
            deliveryId: d.id,
            error: markErr.message,
          }),
        );
      }
      continue;
    }

    const { error: enqueueErr } = await supabase.schema('notifications' as never).rpc(
      'queue_send' as never,
      {
        p_queue: targetQueue,
        p_message: { deliveryId: d.id, idempotencyKey: d.idempotency_key, traceId },
      } as never,
    );

    if (enqueueErr) {
      allOk = false;
      console.error(
        JSON.stringify({
          level: 'error',
          traceId,
          message: 'dispatch-notifications: per-channel enqueue failed',
          deliveryId: d.id,
          channel: d.channel,
          targetQueue,
          error: enqueueErr.message,
        }),
      );
    }
  }

  if (allOk) {
    await supabase
      .schema('notifications' as never)
      .from('notification_events' as never)
      .update({ status: 'completed' } as never)
      .eq('id', eventId);
  }

  return allOk;
}

/** Acknowledge a dispatch message by deleting it from the queue. */
async function ackMessage(
  supabase: ReturnType<typeof createServiceRoleClient>,
  msgId: number,
): Promise<void> {
  await supabase.schema('notifications' as never).rpc(
    'queue_delete' as never,
    {
      p_queue: 'notification_dispatch',
      p_msg_id: msgId,
    } as never,
  );
}

/** Map channel → the per-channel queue it dispatches to. */
function queueForChannel(channel: DeliveryRow['channel']): string | null {
  switch (channel) {
    case 'email':
      return 'email_send';
    case 'sms':
    case 'push':
      return 'sms_send'; // sms_send doubles as push_send in Phase 0 (both stubbed)
    case 'in_app':
      return null;
  }
}
