/**
 * Action: events/publish
 *
 * The fan-out endpoint for events. Given a draft or scheduled event:
 *   1. Resolve its audience via exco.resolve_audience(jsonb).
 *   2. Look up members with a claimed auth account.
 *   3. Insert notification_events (event_type='event.published',
 *      payload carries event_id + name + start_at) + one
 *      notification_deliveries row per requested channel (in_app,
 *      email). Currently every published event uses the default
 *      in_app + email channel set — a per-event channel picker is a
 *      Slice E4 UI decision, not blocking here.
 *   4. Flip status → published, set published_at + snapshot
 *      resolved_audience_size on the event row.
 *   5. Audit.
 *
 * The reminder cadence generator is a SEPARATE concern (pg_cron sweep
 * over active published events); this endpoint only creates the
 * initial announcement.
 *
 * Auth: event.publish at the row's owner_scope_id.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import {
  conflict,
  forbidden,
  internalError,
  notFound,
  success,
  unauthorized,
} from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z.object({ id: z.string().uuid() }).strict();

interface EventRow {
  readonly id: string;
  readonly owner_scope_id: string;
  readonly status: string;
  readonly name: string;
  readonly description: string;
  readonly start_at: string;
  readonly audience_definition: Record<string, unknown>;
}

interface SuccessBody {
  readonly id: string;
  readonly deliveryCount: number;
  readonly recipientCount: number;
  readonly resolvedAudienceSize: number;
  readonly traceId: string;
}

// Channels the initial event publish uses. Matches the announcements
// publish default. Forum wire-up lands with Phase 8; here we send in
// in_app + email so members with either channel active get notified.
const DELIVERY_CHANNELS: ReadonlyArray<'in_app' | 'email'> = ['in_app', 'email'];
const PROVIDER_BY_CHANNEL: Record<'in_app' | 'email', string> = {
  in_app: 'db',
  email: 'resend',
};

export async function publishEvent(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();

  // 1. Load event
  const { data: existing, error: loadErr } = await serviceClient
    .schema('exco' as never)
    .from('events' as never)
    .select('id, owner_scope_id, status, name, description, start_at, audience_definition')
    .eq('id', input.id)
    .maybeSingle();

  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'events/publish: load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!existing) return withCors(req, notFound('event', ctx.traceId));

  const row = existing as EventRow;

  // 2. Authorize
  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'event.publish',
    scopeId: row.owner_scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('event.publish', ctx.traceId, { scopeId: row.owner_scope_id }));
  }

  // 3. Status guard
  if (row.status !== 'draft' && row.status !== 'scheduled') {
    return withCors(
      req,
      conflict(
        'EVENT_NOT_PUBLISHABLE',
        `Cannot publish event in status "${row.status}"`,
        ctx.traceId,
      ),
    );
  }

  // 4. Resolve audience
  const { data: audienceRows, error: resolveErr } = await serviceClient
    .schema('exco' as never)
    .rpc('resolve_audience' as never, { def: row.audience_definition } as never);

  if (resolveErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'events/publish: resolve_audience RPC failed',
        code: resolveErr.code,
        error: resolveErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const memberIds = ((audienceRows ?? []) as ReadonlyArray<{ member_id: string }>).map(
    (r) => r.member_id,
  );

  // 5. Members with claimed auth accounts (only they get delivery rows).
  let claimedAccounts: ReadonlyArray<{ auth_user_id: string; member_id: string }> = [];
  if (memberIds.length > 0) {
    const { data: accountRows, error: accErr } = await serviceClient
      .schema('core' as never)
      .from('member_accounts' as never)
      .select('member_id, auth_user_id')
      .in('member_id', memberIds)
      .not('auth_user_id', 'is', null);

    if (accErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'events/publish: member_accounts lookup failed',
          error: accErr.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }

    claimedAccounts = (accountRows ?? []) as ReadonlyArray<{
      auth_user_id: string;
      member_id: string;
    }>;
  }

  // 6. Fan out
  let deliveryCount = 0;
  if (claimedAccounts.length > 0) {
    const eventRows = claimedAccounts.map((acc) => ({
      event_type: 'event.published',
      severity: 'info',
      recipient_user_id: acc.auth_user_id,
      scope_id: row.owner_scope_id,
      payload: {
        event_id: row.id,
        title: row.name,
        body: row.description,
        start_at: row.start_at,
      },
      status: 'pending',
    }));

    const { data: insertedEvents, error: eventErr } = await serviceClient
      .schema('notifications' as never)
      .from('notification_events' as never)
      .insert(eventRows as never)
      .select('id');

    if (eventErr || !insertedEvents) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'events/publish: notification_events insert failed',
          code: eventErr?.code,
          error: eventErr?.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }

    const eventIds = (insertedEvents as ReadonlyArray<{ id: string }>).map((r) => r.id);

    const deliveryRows = eventIds.flatMap((eventId) =>
      DELIVERY_CHANNELS.map((channel) => ({
        event_id: eventId,
        channel,
        provider: PROVIDER_BY_CHANNEL[channel],
        status: 'pending',
        idempotency_key: `${eventId}:${channel}`,
      })),
    );

    const { error: deliveryErr } = await serviceClient
      .schema('notifications' as never)
      .from('notification_deliveries' as never)
      .insert(deliveryRows as never);

    if (deliveryErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'events/publish: notification_deliveries insert failed',
          code: deliveryErr.code,
          error: deliveryErr.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }

    deliveryCount = deliveryRows.length;
  }

  // 7. Flip → published + snapshot audience size
  const { error: updateErr } = await serviceClient
    .schema('exco' as never)
    .from('events' as never)
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      resolved_audience_size: memberIds.length,
      updated_by: ctx.userId,
    } as never)
    .eq('id', row.id);

  if (updateErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'events/publish: status flip failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(serviceClient, ctx, {
    action: 'event.published',
    entitySchema: 'exco',
    entityTable: 'events',
    entityId: row.id,
    scopeId: row.owner_scope_id,
    metadata: {
      recipientCount: claimedAccounts.length,
      deliveryCount,
      resolvedAudienceSize: memberIds.length,
    },
  });

  const body: SuccessBody = {
    id: row.id,
    recipientCount: claimedAccounts.length,
    deliveryCount,
    resolvedAudienceSize: memberIds.length,
    traceId: ctx.traceId,
  };
  return withCors(req, success(body));
}
