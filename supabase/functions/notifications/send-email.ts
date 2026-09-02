/**
 * Edge Function: send-email
 *
 * The pgmq consumer for `email_send`. Reads delivery ids off the queue,
 * fetches the delivery + parent event, calls Resend, and updates the
 * delivery row's status.
 *
 * Idempotency (ADR-0015 + the plan's E8 spec):
 *   The notification_deliveries row has a UNIQUE idempotency_key
 *   (`'<eventId>:email'`) created when the dispatcher fanned out. This
 *   function:
 *     1. Re-reads the delivery row's status. If already 'sent', skip
 *        (the queue probably re-delivered after a visibility timeout).
 *     2. Otherwise calls Resend with that idempotency_key as the
 *        `Idempotency-Key` header — Resend dedups server-side too.
 *
 *   The combined check ("are we already sent?" + Resend's server-side
 *   dedup) guarantees the user receives the email exactly once even
 *   under arbitrary retry storms.
 *
 * Templates: Phase 0 ships an inline minimal template (subject from
 * event_type, body from payload key/values). Real templated emails
 * land in Phase 6 (Notification Engine) with notification_templates.
 */

import { z } from 'npm:zod@3.24.1';

import { withCors } from '../_shared/cors.ts';
import { internalError, notFound, success, unauthorized } from '../_shared/errors.ts';
import { buildContext } from '../_shared/request-context.ts';
import { checkWorkerSecret } from '../_shared/worker-auth.ts';
import { createServiceRoleClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM');

const inputSchema = z
  .object({
    batchSize: z.number().int().min(1).max(50).default(5),
    visibilityTimeoutSec: z.number().int().min(5).max(600).default(60),
  })
  .strict()
  .default({ batchSize: 5, visibilityTimeoutSec: 60 });

interface QueueMessage {
  msg_id: number;
  message: { deliveryId: string; idempotencyKey: string; traceId?: string };
}

interface DeliveryRow {
  id: string;
  event_id: string;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  idempotency_key: string;
  attempt_count: number;
}

interface EventRow {
  event_type: string;
  recipient_user_id: string | null;
  recipient_email: string | null;
  payload: Record<string, unknown>;
}

interface SuccessBody {
  processed: number;
  failed: number;
  skipped: number;
  traceId: string;
}

export async function sendEmail(req: Request): Promise<Response> {
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
        handler: 'sendEmail',
        reason: workerAuth.reason,
      }),
    );
    return withCors(req, unauthorized(ctx.traceId));
  }

  if (!RESEND_API_KEY || !EMAIL_FROM) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'send-email: RESEND_API_KEY or EMAIL_FROM not configured',
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);

  const supabase = createServiceRoleClient();
  const { batchSize, visibilityTimeoutSec } = parsed.data;

  const { data: messages, error: readErr } = await supabase.schema('notifications' as never).rpc(
    'queue_read' as never,
    {
      p_queue: 'email_send',
      p_vt: visibilityTimeoutSec,
      p_qty: batchSize,
    } as never,
  );

  if (readErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'send-email: queue_read failed',
        error: readErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const batch = (messages as QueueMessage[] | null) ?? [];

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const msg of batch) {
    const result = await processOne(supabase, ctx.traceId, msg.message.deliveryId);
    if (result === 'sent') {
      processed++;
      await ackMessage(supabase, msg.msg_id);
    } else if (result === 'skipped') {
      // Already sent OR delivery row doesn't exist — ack so it doesn't
      // loop on the queue.
      skipped++;
      await ackMessage(supabase, msg.msg_id);
    } else {
      // 'retry': leave on queue, visibility timeout returns it for
      // another attempt.
      failed++;
    }
  }

  const body: SuccessBody = { processed, failed, skipped, traceId: ctx.traceId };
  return withCors(req, success(body));
}

type ProcessResult = 'sent' | 'skipped' | 'retry';

async function processOne(
  supabase: ReturnType<typeof createServiceRoleClient>,
  traceId: string,
  deliveryId: string,
): Promise<ProcessResult> {
  // 1. Fetch delivery row.
  const { data: deliveryRaw, error: dErr } = await supabase
    .schema('notifications' as never)
    .from('notification_deliveries' as never)
    .select('id, event_id, status, idempotency_key, attempt_count')
    .eq('id', deliveryId)
    .maybeSingle();

  if (dErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId,
        message: 'send-email: delivery lookup failed',
        deliveryId,
        error: dErr.message,
      }),
    );
    return 'retry';
  }
  if (!deliveryRaw) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        traceId,
        message: 'send-email: delivery row not found, dropping message',
        deliveryId,
      }),
    );
    return 'skipped';
  }

  const delivery = deliveryRaw as DeliveryRow;

  // 2. Already sent? Skip (queue re-delivery after timeout).
  if (delivery.status === 'sent') return 'skipped';

  // 3. Fetch event row for recipient + content.
  const { data: eventRaw, error: eErr } = await supabase
    .schema('notifications' as never)
    .from('notification_events' as never)
    .select('event_type, recipient_user_id, recipient_email, payload')
    .eq('id', delivery.event_id)
    .maybeSingle();

  if (eErr || !eventRaw) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId,
        message: 'send-email: event lookup failed',
        deliveryId,
        eventId: delivery.event_id,
        error: eErr?.message,
      }),
    );
    return 'retry';
  }

  const event = eventRaw as EventRow;
  const recipientEmail = await resolveEmail(supabase, event);

  if (!recipientEmail) {
    await markDelivery(supabase, delivery.id, {
      status: 'failed',
      error_message: 'no recipient email available',
      attempt_count: delivery.attempt_count + 1,
    });
    return 'skipped';
  }

  // 4. Send via Resend.
  const { subject, html, text } = renderEmail(event);
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Idempotency-Key': delivery.idempotency_key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: recipientEmail,
      subject,
      html,
      text,
    }),
  });

  if (!resp.ok) {
    const errorBody = await resp.text();
    console.error(
      JSON.stringify({
        level: 'error',
        traceId,
        message: 'send-email: Resend rejected',
        deliveryId,
        status: resp.status,
        body: errorBody.slice(0, 500),
      }),
    );

    // 4xx (except 429) is permanent — mark failed, no retry.
    // 429 + 5xx are transient — bump attempt, leave for retry.
    const isPermanent = resp.status >= 400 && resp.status < 500 && resp.status !== 429;
    await markDelivery(supabase, delivery.id, {
      status: isPermanent ? 'failed' : 'retrying',
      error_message: `resend ${resp.status}: ${errorBody.slice(0, 200)}`,
      attempt_count: delivery.attempt_count + 1,
    });
    return isPermanent ? 'skipped' : 'retry';
  }

  // 5. Success — mark delivery sent.
  await markDelivery(supabase, delivery.id, {
    status: 'sent',
    attempt_count: delivery.attempt_count + 1,
    error_message: null,
  });
  return 'sent';
}

/**
 * Resolve the recipient's email — prefer the explicit recipient_email
 * on the event; fall back to auth.users.email for the recipient_user_id.
 */
async function resolveEmail(
  supabase: ReturnType<typeof createServiceRoleClient>,
  event: EventRow,
): Promise<string | null> {
  if (event.recipient_email) return event.recipient_email;
  if (!event.recipient_user_id) return null;

  // Via the Auth admin API, not PostgREST. `.from('users')` resolved to
  // `public.users`, which does not exist, and `.schema('auth')` would not
  // have helped either — `auth` is deliberately not in the PostgREST
  // exposed-schema list. The service-role key is exactly what the admin
  // API is for.
  const { data, error } = await supabase.auth.admin.getUserById(event.recipient_user_id);
  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'send-email: auth.admin.getUserById failed',
        userId: event.recipient_user_id,
        error: error.message,
      }),
    );
    return null;
  }
  return data.user?.email ?? null;
}

async function markDelivery(
  supabase: ReturnType<typeof createServiceRoleClient>,
  deliveryId: string,
  patch: {
    status: 'pending' | 'sent' | 'failed' | 'retrying';
    error_message?: string | null;
    attempt_count: number;
  },
): Promise<void> {
  await supabase
    .schema('notifications' as never)
    .from('notification_deliveries' as never)
    .update({
      status: patch.status,
      error_message: patch.error_message ?? null,
      attempt_count: patch.attempt_count,
      last_attempt_at: new Date().toISOString(),
    } as never)
    .eq('id', deliveryId);
}

/**
 * Phase 0 inline email rendering. Real templates land in Phase 6.
 * Keeps the email content predictable + grep-able while preserving
 * the event_type as the subject.
 */
function renderEmail(event: EventRow): { subject: string; html: string; text: string } {
  const subject = `Shesa: ${event.event_type}`;
  const payloadLines = Object.entries(event.payload ?? {}).map(([k, v]) => `${k}: ${String(v)}`);
  const text = [`Event: ${event.event_type}`, '', ...payloadLines].join('\n');
  const html = `
    <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 600px;">
      <h2 style="margin: 0 0 16px;">${escapeHtml(event.event_type)}</h2>
      ${payloadLines.length ? `<ul>${payloadLines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>` : ''}
      <p style="color: #666; font-size: 12px; margin-top: 24px;">
        This is a placeholder Phase 0 notification template. Branded templates land in Phase 6.
      </p>
    </div>
  `;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function ackMessage(
  supabase: ReturnType<typeof createServiceRoleClient>,
  msgId: number,
): Promise<void> {
  await supabase.schema('notifications' as never).rpc(
    'queue_delete' as never,
    {
      p_queue: 'email_send',
      p_msg_id: msgId,
    } as never,
  );
}
