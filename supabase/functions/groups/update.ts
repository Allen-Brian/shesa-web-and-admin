/**
 * Action: groups/update
 *
 * POST /functions/v1/groups/update — patches an event group.
 * Supported patches:
 *   - status: 'active' → 'closed' → 'archived' (one-way monotonic).
 *   - showInSidebar toggle.
 *   - name / description / startsOn / endsOn (metadata polish).
 *
 * Auth: group.manage at the group's scope (mainstream).
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
  validationError,
} from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const STATUSES = ['active', 'closed', 'archived'] as const;
type GroupStatus = (typeof STATUSES)[number];

const inputSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    startsOn: z.string().date().nullable().optional(),
    endsOn: z.string().date().nullable().optional(),
    status: z.enum(STATUSES).optional(),
    showInSidebar: z.boolean().optional(),
  })
  .strict();

interface GroupRow {
  readonly id: string;
  readonly scope_id: string;
  readonly name: string;
  readonly status: GroupStatus;
}

const STATUS_ORDER: Record<GroupStatus, number> = { active: 0, closed: 1, archived: 2 };

export async function updateGroup(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();
  const { data: existing, error: loadErr } = await serviceClient
    .schema('finance' as never)
    .from('groups' as never)
    .select('id, scope_id, name, status')
    .eq('id', input.id)
    .maybeSingle();
  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'groups/update: load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!existing) return withCors(req, notFound('group', ctx.traceId));
  const row = existing as GroupRow;

  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'group.manage',
    scopeId: row.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('group.manage', ctx.traceId, { scopeId: row.scope_id }));
  }

  // Status is monotonic — no reopens. A closed group can move to
  // archived but never back to active; reject backwards transitions.
  if (input.status && STATUS_ORDER[input.status] < STATUS_ORDER[row.status]) {
    return withCors(
      req,
      conflict(`Cannot move group from ${row.status} back to ${input.status}.`, ctx.traceId, {
        current: row.status,
        requested: input.status,
      }),
    );
  }

  if (input.startsOn && input.endsOn && new Date(input.endsOn) < new Date(input.startsOn)) {
    return withCors(
      req,
      validationError('endsOn must be on or after startsOn.', ctx.traceId, {
        field: 'endsOn',
      }),
    );
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.startsOn !== undefined) patch.starts_on = input.startsOn;
  if (input.endsOn !== undefined) patch.ends_on = input.endsOn;
  if (input.status !== undefined) patch.status = input.status;
  if (input.showInSidebar !== undefined) patch.show_in_sidebar = input.showInSidebar;

  const { error: updateErr } = await serviceClient
    .schema('finance' as never)
    .from('groups' as never)
    .update(patch as never)
    .eq('id', row.id);
  if (updateErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'groups/update: update failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    if (updateErr.code === '23514') {
      return withCors(req, validationError(updateErr.message, ctx.traceId));
    }
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(serviceClient, ctx, {
    action: 'group.updated',
    entitySchema: 'finance',
    entityTable: 'groups',
    entityId: row.id,
    scopeId: row.scope_id,
    metadata: { patch, priorStatus: row.status },
  });

  return withCors(req, success({ id: row.id, traceId: ctx.traceId }));
}
