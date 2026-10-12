/**
 * Edge Function: send-sms-stub
 *
 * The pgmq consumer for `sms_send`. Logs the would-be SMS to the
 * runtime log and marks the delivery 'sent'. No real SMS provider in
 * Phase 0 — see ADR-0019 + the plan's E9 go/no-go note. When MTN /
 * Orange OTP integration lands (Phase 6 at earliest), this function
 * gets swapped for one that calls the real provider; the queue
 * + delivery contracts don't change.
 *
 * Why a stub at all instead of skipping: the full pipeline
 * (enqueue → dispatch → per-channel send → marked sent) is exercised
 * end-to-end. When real SMS arrives, only this file changes.
 */

import { z } from 'npm:zod@3.24.1';

import { withCors } from '../_shared/cors.ts';
import { internalError, success, unauthorized } from '../_shared/errors.ts';
import { buildContext } from '../_shared/request-context.ts';
import { checkWorkerSecret } from '../_shared/worker-auth.ts';
import { createServiceRoleClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z
  .object({
    batchSize: z.number().int().min(1).max(50).default(5),
    visibilityTimeoutSec: z.number().int().min(5).max(600).default(30),
  })
  .strict()
  .default({ batchSize: 5, visibilityTimeoutSec: 30 });

interface QueueMessage {
  msg_id: number;
  message: { deliveryId: string; idempotencyKey: string; traceId?: string };
}

interface DeliveryRow {
  id: string;
  event_id: string;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  attempt_count: number;
}

interface EventRow {
  event_type: string;
  recipient_phone: string | null;
  payload: Record<string, unknown>;
}

interface SuccessBody {
  processed: number;
  skipped: number;
  traceId: string;
}

export async function sendSmsStub(req: Request): Promise<Response> {
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
        handler: 'sendSmsStub',
        reason: workerAuth.reason,
      }),
    );
    return withCors(req, unauthorized(ctx.traceId));
  }

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);

  const supabase = createServiceRoleClient();
  const { batchSize, visibilityTimeoutSec } = parsed.data;

  const { data: messages, error: readErr } = await supabase.schema('notifications' as never).rpc(
    'queue_read' as never,
    {
      p_queue: 'sms_send',
      p_vt: visibilityTimeoutSec,
      p_qty: batchSize,
    } as never,
  );

  if (readErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'send-sms-stub: queue_read failed',
        error: readErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const batch = (messages as QueueMessage[] | null) ?? [];
  let processed = 0;
  let skipped = 0;

  for (const msg of batch) {
    const handled = await processOne(supabase, ctx.traceId, msg.message.deliveryId);
    if (handled === 'sent') processed++;
    else skipped++;
    // Always ack: the stub never fails meaningfully.
    await ackMessage(supabase, msg.msg_id);
  }

  const body: SuccessBody = { processed, skipped, traceId: ctx.traceId };
  return withCors(req, success(body));
}

async function processOne(
  supabase: ReturnType<typeof createServiceRoleClient>,
  traceId: string,
  deliveryId: string,
): Promise<'sent' | 'skipped'> {
  const { data: deliveryRaw } = await supabase
    .schema('notifications' as never)
    .from('notification_deliveries' as never)
    .select('id, event_id, status, attempt_count')
    .eq('id', deliveryId)
    .maybeSingle();

  if (!deliveryRaw) return 'skipped';

  const delivery = deliveryRaw as DeliveryRow;
  if (delivery.status === 'sent') return 'skipped';

  const { data: eventRaw } = await supabase
    .schema('notifications' as never)
    .from('notification_events' as never)
    .select('event_type, recipient_phone, payload')
    .eq('id', delivery.event_id)
    .maybeSingle();

  const event = eventRaw as EventRow | null;

  // Log the would-be SMS — this is the "stub" part. Real providers
  // would replace this with their API call.
  console.log(
    JSON.stringify({
      level: 'info',
      provider: 'stub',
      traceId,
      deliveryId,
      eventType: event?.event_type ?? '(unknown)',
      recipient: event?.recipient_phone ?? '(no phone on event)',
      payloadKeys: event?.payload ? Object.keys(event.payload) : [],
      note: 'SMS not actually sent in Phase 0 — see ADR-0019 + E9 OTP go/no-go.',
    }),
  );

  await supabase
    .schema('notifications' as never)
    .from('notification_deliveries' as never)
    .update({
      status: 'sent',
      attempt_count: delivery.attempt_count + 1,
      last_attempt_at: new Date().toISOString(),
    } as never)
    .eq('id', delivery.id);

  return 'sent';
}

async function ackMessage(
  supabase: ReturnType<typeof createServiceRoleClient>,
  msgId: number,
): Promise<void> {
  await supabase.schema('notifications' as never).rpc(
    'queue_delete' as never,
    {
      p_queue: 'sms_send',
      p_msg_id: msgId,
    } as never,
  );
}
