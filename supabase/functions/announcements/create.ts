/**
 * Action: announcements/create
 *
 * POST /functions/v1/announcements/create — creates a new draft
 * announcement at the caller's chosen owner scope.
 *
 * Per ADR-0033 Phase 2 refinement, exco.announcements is on the "always
 * through an Edge Function" list — Server Actions cannot write to it
 * directly. This handler owns:
 *   - auth (announcement.create at ownerScopeId)
 *   - input validation
 *   - the actual INSERT
 *   - the audit trail
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import { forbidden, internalError, success, unauthorized } from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const CHANNELS = ['in_app', 'email', 'forum'] as const;

const inputSchema = z
  .object({
    ownerScopeId: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    body: z.string().default(''),

    // Trust that the Server Action + client validated via
    // packages/domain/audience (Zod). We accept an opaque record here
    // — the SQL resolver will reject nonsense at publish time.
    audienceDefinition: z.record(z.unknown()).default({}),

    // The three-channel array from the product spec. in_app is always
    // included; the DB CHECK enforces this even if the client forgot.
    channels: z.array(z.enum(CHANNELS)).default(['in_app']),

    // Optional auto-archive time.
    expiresAt: z.string().datetime().nullable().optional(),

    // Optional scheduled publish time. When provided, the row is
    // created with status='scheduled' + scheduled_publish_at set.
    // Absent / null → default 'draft' status. Must be a strictly
    // future instant (checked here so the DB error surface is smaller).
    scheduledPublishAt: z.string().datetime().nullable().optional(),
  })
  .strict();

interface SuccessBody {
  readonly id: string;
  readonly traceId: string;
}

export async function createAnnouncement(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const userClient = createUserClient(ctx.jwt);

  const allowed = await authorize(userClient, ctx, {
    action: 'announcement.create',
    scopeId: input.ownerScopeId,
  });
  if (!allowed) {
    return withCors(
      req,
      forbidden('announcement.create', ctx.traceId, { scopeId: input.ownerScopeId }),
    );
  }

  // Ensure in_app is present even if the caller sent only { email }.
  // The DB CHECK would fire otherwise; we normalize here for a cleaner
  // error message and predictable stored shape.
  const channels: readonly string[] = input.channels.includes('in_app')
    ? input.channels
    : ['in_app', ...input.channels];

  // Derive lifecycle status from the presence of a scheduled time.
  // The DB CHECK announcements_scheduled_needs_time requires both
  // status='scheduled' and scheduled_publish_at NOT NULL, so they
  // move together.
  const scheduledPublishAt = input.scheduledPublishAt ?? null;
  const initialStatus: 'draft' | 'scheduled' =
    scheduledPublishAt && new Date(scheduledPublishAt).getTime() > Date.now()
      ? 'scheduled'
      : 'draft';

  // Writes bypass RLS via service-role because exco.announcements has
  // no INSERT policy for authenticated (per ADR-0033).
  const serviceClient = createServiceRoleClient();
  const { data: row, error } = await serviceClient
    .schema('exco' as never)
    .from('announcements' as never)
    .insert({
      owner_scope_id: input.ownerScopeId,
      title: input.title,
      body: input.body,
      audience_definition: input.audienceDefinition,
      channels,
      expires_at: input.expiresAt ?? null,
      status: initialStatus,
      scheduled_publish_at: initialStatus === 'scheduled' ? scheduledPublishAt : null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as never)
    .select('id')
    .maybeSingle();

  if (error || !row) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'announcements/create: insert failed',
        code: error?.code,
        error: error?.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const id = (row as { id: string }).id;

  await logEvent(serviceClient, ctx, {
    action: 'announcement.created',
    entitySchema: 'exco',
    entityTable: 'announcements',
    entityId: id,
    scopeId: input.ownerScopeId,
    metadata: { title: input.title },
  });

  const body: SuccessBody = { id, traceId: ctx.traceId };
  return withCors(req, success(body, 201));
}
