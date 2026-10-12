/**
 * Action: announcements/update
 *
 * PATCH-style update for a draft or scheduled announcement. Every field
 * is optional; unspecified fields stay unchanged. Once an announcement
 * is 'published', mutations go through the (future) edit-after-publish
 * flow which carries the change-notification requirement — this
 * endpoint refuses to touch published/unpublished/archived rows.
 *
 * Auth: announcement.update at the row's owner_scope_id.
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

const CHANNELS = ['in_app', 'email', 'forum'] as const;

const inputSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(200).optional(),
    body: z.string().optional(),
    audienceDefinition: z.record(z.unknown()).optional(),
    channels: z.array(z.enum(CHANNELS)).optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  })
  .strict();

interface AnnouncementRow {
  readonly id: string;
  readonly owner_scope_id: string;
  readonly status: string;
}

interface SuccessBody {
  readonly id: string;
  readonly traceId: string;
}

export async function updateAnnouncement(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  // 1. Load the row to get owner_scope_id + current status.
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
        message: 'announcements/update: load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!existing) return withCors(req, notFound('announcement', ctx.traceId));

  const row = existing as AnnouncementRow;

  // 2. Authorize against the row's owner_scope_id.
  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'announcement.update',
    scopeId: row.owner_scope_id,
  });
  if (!allowed) {
    return withCors(
      req,
      forbidden('announcement.update', ctx.traceId, { scopeId: row.owner_scope_id }),
    );
  }

  // 3. Only draft or scheduled rows can be updated by this endpoint.
  //    Published / unpublished / archived rows go through the (future)
  //    edit-after-publish flow that carries the change-notification.
  if (row.status !== 'draft' && row.status !== 'scheduled') {
    return withCors(
      req,
      conflict(
        'ANNOUNCEMENT_NOT_EDITABLE',
        `Cannot update announcement in status "${row.status}"`,
        ctx.traceId,
      ),
    );
  }

  // 4. Build the patch. Only include fields the caller provided.
  const patch: Record<string, unknown> = { updated_by: ctx.userId };
  if (input.title !== undefined) patch.title = input.title;
  if (input.body !== undefined) patch.body = input.body;
  if (input.audienceDefinition !== undefined) patch.audience_definition = input.audienceDefinition;
  if (input.channels !== undefined) {
    patch.channels = input.channels.includes('in_app')
      ? input.channels
      : ['in_app', ...input.channels];
  }
  if (input.expiresAt !== undefined) patch.expires_at = input.expiresAt;

  const { error: updateErr } = await serviceClient
    .schema('exco' as never)
    .from('announcements' as never)
    .update(patch as never)
    .eq('id', input.id);

  if (updateErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'announcements/update: update failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(serviceClient, ctx, {
    action: 'announcement.updated',
    entitySchema: 'exco',
    entityTable: 'announcements',
    entityId: input.id,
    scopeId: row.owner_scope_id,
    metadata: { fieldsChanged: Object.keys(patch).filter((k) => k !== 'updated_by') },
  });

  const body: SuccessBody = { id: input.id, traceId: ctx.traceId };
  return withCors(req, success(body));
}
