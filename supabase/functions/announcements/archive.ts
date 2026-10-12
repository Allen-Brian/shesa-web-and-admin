/**
 * Action: announcements/archive
 *
 * Soft-remove — transitions the announcement to 'archived'. No hard
 * DELETE (per the cross-cutting soft-delete-only rule in
 * docs/product/entities.md#remove-vs-archive).
 *
 * Delivery rows in notifications.notification_deliveries are NOT touched
 * — archived announcements keep their audit trail. Recipients' inbox
 * queries decide whether to still surface an archived announcement
 * (typically not, but that's a member-side rendering choice).
 *
 * Auth: announcement.archive at the row's owner_scope_id.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import { forbidden, internalError, notFound, success, unauthorized } from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z.object({ id: z.string().uuid() }).strict();

interface AnnouncementRow {
  readonly id: string;
  readonly owner_scope_id: string;
  readonly status: string;
}

interface SuccessBody {
  readonly id: string;
  readonly traceId: string;
}

export async function archiveAnnouncement(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();
  const { data: existing, error: loadErr } = await serviceClient
    .schema('exco' as never)
    .from('announcements' as never)
    .select('id, owner_scope_id, status')
    .eq('id', input.id)
    .maybeSingle();

  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'announcements/archive: load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!existing) return withCors(req, notFound('announcement', ctx.traceId));

  const row = existing as AnnouncementRow;

  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'announcement.archive',
    scopeId: row.owner_scope_id,
  });
  if (!allowed) {
    return withCors(
      req,
      forbidden('announcement.archive', ctx.traceId, { scopeId: row.owner_scope_id }),
    );
  }

  // Idempotent — archiving an already-archived row is a no-op success.
  if (row.status === 'archived') {
    const body: SuccessBody = { id: input.id, traceId: ctx.traceId };
    return withCors(req, success(body));
  }

  const { error: updateErr } = await serviceClient
    .schema('exco' as never)
    .from('announcements' as never)
    .update({ status: 'archived', updated_by: ctx.userId } as never)
    .eq('id', input.id);

  if (updateErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'announcements/archive: update failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(serviceClient, ctx, {
    action: 'announcement.archived',
    entitySchema: 'exco',
    entityTable: 'announcements',
    entityId: input.id,
    scopeId: row.owner_scope_id,
    metadata: { fromStatus: row.status },
  });

  const body: SuccessBody = { id: input.id, traceId: ctx.traceId };
  return withCors(req, success(body));
}
