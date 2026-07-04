/**
 * Action: announcements/publish
 *
 * The fan-out endpoint. Given a draft or scheduled announcement:
 *   1. Resolve its audience via exco.resolve_audience(jsonb).
 *   2. Look up which resolved members have a claimed auth account
 *      (core.member_accounts.auth_user_id NOT NULL).
 *   3. For each such member, create a notification_events row + one
 *      notification_deliveries row per requested channel that maps to
 *      a delivery channel (in_app → in_app, email → email; 'forum' is
 *      NOT a delivery channel — a forum post is a separate write into
 *      connect.forum_posts landing in Phase 8).
 *   4. Transition the announcement to 'published' + set published_at.
 *   5. Audit both the state transition and the fan-out size.
 *
 * All inserts run via service-role (notifications.* has no INSERT
 * grant for authenticated per E6; exco.announcements same per ADR-0033).
 * The user's permission was already checked at step 0.
 *
 * The dispatch step (notification_deliveries → provider send) is a
 * separate concern owned by the notifications dispatcher — this
 * function only creates the pending rows. That keeps this endpoint
 * fast enough to run inside a Server Action request.
 *
 * Auth: announcement.publish at the row's owner_scope_id.
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

interface AnnouncementRow {
  readonly id: string;
  readonly owner_scope_id: string;
  readonly status: string;
  readonly title: string;
  readonly body: string;
  readonly channels: readonly string[];
  readonly audience_definition: Record<string, unknown>;
}

interface SuccessBody {
  readonly id: string;
  readonly deliveryCount: number;
  readonly recipientCount: number;
  readonly traceId: string;
}

/** Announcement-level channels that map to notification delivery channels. */
const DELIVERY_CHANNEL_MAP: Record<string, 'in_app' | 'email'> = {
  in_app: 'in_app',
  email: 'email',
  // 'forum' intentionally absent — forum posts land in Phase 8.
};

const PROVIDER_BY_CHANNEL: Record<'in_app' | 'email', string> = {
  in_app: 'db',
  email: 'resend',
};

export async function publishAnnouncement(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();

  // ─── 1. Load the announcement ─────────────────────────────────────
  const { data: existing, error: loadErr } = await serviceClient
    .schema('exco' as never)
    .from('announcements' as never)
    .select('id, owner_scope_id, status, title, body, channels, audience_definition')
    .eq('id', input.id)
    .maybeSingle();

  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'announcements/publish: load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!existing) return withCors(req, notFound('announcement', ctx.traceId));

  const row = existing as AnnouncementRow;

  // ─── 2. Authorize ────────────────────────────────────────────────
  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'announcement.publish',
    scopeId: row.owner_scope_id,
  });
  if (!allowed) {
    return withCors(
      req,
      forbidden('announcement.publish', ctx.traceId, { scopeId: row.owner_scope_id }),
    );
  }

  // ─── 3. Status guard ─────────────────────────────────────────────
  if (row.status !== 'draft' && row.status !== 'scheduled') {
    return withCors(
      req,
      conflict(
        'ANNOUNCEMENT_NOT_PUBLISHABLE',
        `Cannot publish announcement in status "${row.status}"`,
        ctx.traceId,
      ),
    );
  }

  // ─── 4. Resolve audience ────────────────────────────────────────
  const { data: audienceRows, error: resolveErr } = await serviceClient
    .schema('exco' as never)
    .rpc('resolve_audience' as never, { def: row.audience_definition } as never);

  if (resolveErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'announcements/publish: resolve_audience RPC failed',
        code: resolveErr.code,
        error: resolveErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const memberIds = ((audienceRows ?? []) as ReadonlyArray<{ member_id: string }>).map(
    (r) => r.member_id,
  );

  // ─── 5. Map member → auth user (only claimed accounts get in-app) ─
  //
  // Members whose account is not yet claimed have auth_user_id = NULL.
  // We can still email them if the announcement has 'email' as a
  // channel and the member has an email on file — but for MVP we ship
  // the in-app-only path and fold email in via the same
  // notification_events row (recipient_user_id set + recipient_email
  // also set, per the notifications schema which allows both).
  //
  // For members with NO auth account, we skip them for now. A later
  // migration extends to email-only fan-out.
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
          message: 'announcements/publish: member_accounts lookup failed',
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

  // ─── 6. Determine delivery channels ─────────────────────────────
  const deliveryChannels = row.channels
    .map((c) => DELIVERY_CHANNEL_MAP[c])
    .filter((c): c is 'in_app' | 'email' => Boolean(c));

  // ─── 7. Fan out: one notification_event per recipient ────────────
  let deliveryCount = 0;
  if (claimedAccounts.length > 0 && deliveryChannels.length > 0) {
    const eventRows = claimedAccounts.map((acc) => ({
      event_type: 'announcement.published',
      severity: 'info',
      recipient_user_id: acc.auth_user_id,
      scope_id: row.owner_scope_id,
      payload: {
        announcement_id: row.id,
        title: row.title,
        body: row.body,
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
          message: 'announcements/publish: notification_events insert failed',
          code: eventErr?.code,
          error: eventErr?.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }

    const eventIds = (insertedEvents as ReadonlyArray<{ id: string }>).map((r) => r.id);

    // One delivery row per event × channel. idempotency_key convention
    // matches enqueue-notification.
    const deliveryRows = eventIds.flatMap((eventId) =>
      deliveryChannels.map((channel) => ({
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
          message: 'announcements/publish: notification_deliveries insert failed',
          code: deliveryErr.code,
          error: deliveryErr.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }

    deliveryCount = deliveryRows.length;
  }

  // ─── 8. Flip status → published + snapshot audience size ─────────
  //
  // resolved_audience_size records the total members the resolver
  // matched — the "reach" number shown on the list. Distinct from
  // deliveryCount (which is a subset, only members with claimed
  // auth accounts get delivery rows).
  const { error: updateErr } = await serviceClient
    .schema('exco' as never)
    .from('announcements' as never)
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
        message: 'announcements/publish: status flip failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(serviceClient, ctx, {
    action: 'announcement.published',
    entitySchema: 'exco',
    entityTable: 'announcements',
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
    traceId: ctx.traceId,
  };
  return withCors(req, success(body));
}
