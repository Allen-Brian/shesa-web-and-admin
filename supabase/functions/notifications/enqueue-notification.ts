/**
 * Edge Function: enqueue-notification
 *
 * Creates a notification_event row, creates one notification_delivery
 * row per requested channel, and enqueues the event id to the
 * `notification_dispatch` pgmq queue. The dispatch-notifications
 * function picks it up and fans out to the per-channel queues
 * (email_send, sms_send).
 *
 * Why dispatch is a separate step: enqueueing here is fast and runs in
 * the user's request lifecycle (must return quickly so a Server Action
 * doesn't block the UI). The dispatcher does the actual fan-out, sends
 * provider calls, retries, etc. — those are slow and must not block the
 * user-facing path.
 *
 * Auth model (ADR-0033 in practice):
 *   - service_role calls (other Edge Functions, pg_cron) — allowed, any
 *     recipient. The CALLING function is responsible for authorization.
 *   - authenticated user calls — must address themselves only
 *     (recipient_user_id = auth.uid()). Cross-recipient sends are
 *     blocked here; if a feature genuinely needs them, build an
 *     authorized Server Action / Edge Function that calls this one
 *     via service_role after its own permission check.
 *
 * This is the funnel that guarantees every notification event has a
 * captured actor + a clean structure. Direct INSERTs to
 * notifications.notification_events are blocked by RLS for
 * authenticated (per E6).
 */

import { z } from 'npm:zod@3.24.1';

import { withCors } from '../_shared/cors.ts';
import { forbidden, internalError, success, unauthorized } from '../_shared/errors.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const CHANNELS = ['email', 'sms', 'in_app', 'push'] as const;
const SEVERITIES = ['critical', 'important', 'info'] as const;

const inputSchema = z
  .object({
    eventType: z.string().min(1),
    severity: z.enum(SEVERITIES),

    // At least one of these three must be set — enforced by the
    // refine below AND by the table's CHECK constraint.
    recipientUserId: z.string().uuid().nullable().optional(),
    recipientEmail: z.string().email().nullable().optional(),
    recipientPhone: z.string().min(1).nullable().optional(),

    scopeId: z.string().uuid().nullable().optional(),

    payload: z.record(z.unknown()).default({}),

    // The set of channels to attempt delivery on. The dispatcher
    // creates one delivery row per channel + enqueues to that channel's
    // queue.
    channels: z.array(z.enum(CHANNELS)).min(1),
  })
  .strict()
  .refine((d) => d.recipientUserId || d.recipientEmail || d.recipientPhone, {
    message: 'At least one of recipientUserId / recipientEmail / recipientPhone is required',
  });

interface SuccessBody {
  eventId: string;
  deliveryIds: string[];
  traceId: string;
}

interface InsertedEventRow {
  id: string;
}

interface InsertedDeliveryRow {
  id: string;
  channel: string;
}

export async function enqueueNotification(req: Request): Promise<Response> {
  const ctx = buildContext(req);

  // Either authenticated OR system. Anonymous is denied.
  if (!ctx.userId && !ctx.jwt) {
    // Pure anon — no JWT at all. Some service-role contexts have a JWT
    // with role=service_role; we accept those below.
  }

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);

  const input = parsed.data;

  // ── Caller-class gating ────────────────────────────────────────────
  // If the caller is an authenticated user, restrict to self-addressed
  // notifications. Cross-recipient sends require a service-role caller.
  //
  // We detect service-role by the absence of a parsed user id but
  // presence of a JWT (service-role tokens have role=service_role and
  // typically no sub claim). If neither: unauthorized.
  const isAuthenticatedUser = ctx.userId !== null;
  const isServiceRole = !isAuthenticatedUser && ctx.jwt !== null;

  if (!isAuthenticatedUser && !isServiceRole) {
    return withCors(req, unauthorized(ctx.traceId));
  }

  if (isAuthenticatedUser && input.recipientUserId !== ctx.userId) {
    return withCors(
      req,
      forbidden('notification.send_to_other', ctx.traceId, {
        recipient: input.recipientUserId ?? input.recipientEmail ?? input.recipientPhone ?? '',
      }),
    );
  }

  // ── Writes — always via service-role since notifications.* INSERT is
  //    not granted to authenticated (per E6 RLS) ──────────────────────
  const supabase = createServiceRoleClient();

  // 1. Create the event row
  const { data: eventRow, error: eventErr } = await supabase
    .schema('notifications' as never)
    .from('notification_events' as never)
    .insert({
      event_type: input.eventType,
      severity: input.severity,
      recipient_user_id: input.recipientUserId ?? null,
      recipient_email: input.recipientEmail ?? null,
      recipient_phone: input.recipientPhone ?? null,
      scope_id: input.scopeId ?? null,
      payload: input.payload,
      status: 'pending',
    } as never)
    .select('id')
    .maybeSingle();

  if (eventErr || !eventRow) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'enqueue-notification: event insert failed',
        error: eventErr?.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const eventId = (eventRow as InsertedEventRow).id;

  // 2. Create one delivery row per requested channel.
  //    idempotency_key convention: '<event_id>:<channel>' per ADR-0015's
  //    notes — UNIQUE constraint guards against duplicate creation.
  const deliveriesInput = input.channels.map((channel) => ({
    event_id: eventId,
    channel,
    provider: providerForChannel(channel),
    status: 'pending',
    idempotency_key: `${eventId}:${channel}`,
  }));

  const { data: deliveryRows, error: deliveryErr } = await supabase
    .schema('notifications' as never)
    .from('notification_deliveries' as never)
    .insert(deliveriesInput as never)
    .select('id, channel');

  if (deliveryErr || !deliveryRows) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'enqueue-notification: delivery rows insert failed',
        eventId,
        error: deliveryErr?.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  // 3. Enqueue the event id to notification_dispatch.
  const { error: queueErr } = await supabase.schema('notifications' as never).rpc(
    'queue_send' as never,
    {
      p_queue: 'notification_dispatch',
      p_message: { eventId, traceId: ctx.traceId },
    } as never,
  );

  if (queueErr) {
    // The delivery rows exist but the queue write failed. We leave the
    // event at status 'pending' and let the backstop sweep re-enqueue it
    // (notifications.requeue_stranded_events, drained at the top of
    // dispatch-notifications). Rolling back would be worse — the rows
    // ARE valid, and a duplicate dispatch is harmless because every
    // delivery carries a UNIQUE idempotency_key.
    //
    // Until 2026-09-02 this comment claimed a backstop that did not
    // exist, and the swallowed error was how a completely broken queue
    // path stayed invisible for months: every call returned 200 while
    // nothing was ever delivered. The sweep is real now, but the failure
    // is still worth surfacing in the response so a caller can retry
    // rather than assume the notification is on its way.
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'enqueue-notification: queue_send failed — left pending for the backstop sweep',
        eventId,
        error: queueErr.message,
      }),
    );
  } else {
    // Flip event to 'queued' on successful enqueue.
    await supabase
      .schema('notifications' as never)
      .from('notification_events' as never)
      .update({ status: 'queued' } as never)
      .eq('id', eventId);
  }

  const body: SuccessBody = {
    eventId,
    deliveryIds: (deliveryRows as InsertedDeliveryRow[]).map((r) => r.id),
    traceId: ctx.traceId,
  };
  return withCors(req, success(body, 201));
}

/** Map channel → Phase 0 provider. SMS+push are stubs in Phase 0. */
function providerForChannel(channel: (typeof CHANNELS)[number]): string {
  switch (channel) {
    case 'email':
      return 'resend';
    case 'sms':
    case 'push':
      return 'stub';
    case 'in_app':
      return 'db';
  }
}
