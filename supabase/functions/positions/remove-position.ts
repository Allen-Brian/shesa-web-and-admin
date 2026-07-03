/**
 * Edge Function: remove-position
 *
 * Sets removed_at + removed_by on an active position assignment.
 * Requires `position.remove` at the scope. Idempotent: an already-
 * removed row returns 200.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import { forbidden, internalError, notFound, success, unauthorized } from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z.object({ assignmentId: z.string().uuid() }).strict();

export async function removePosition(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const { assignmentId } = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  const { data: current } = await supabase
    .schema('core' as never)
    .from('position_assignments' as never)
    .select('id, scope_id, member_id, removed_at')
    .eq('id', assignmentId)
    .maybeSingle();
  if (!current) return withCors(req, notFound('position_assignment', ctx.traceId));
  const row = current as { scope_id: string; member_id: string; removed_at: string | null };

  const allowed = await authorize(supabase, ctx, {
    action: 'position.remove',
    scopeId: row.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('position.remove', ctx.traceId, { scopeId: row.scope_id }));
  }

  if (row.removed_at) {
    return withCors(req, success({ assignmentId, alreadyRemoved: true, traceId: ctx.traceId }));
  }

  const { error } = await supabase
    .schema('core' as never)
    .from('position_assignments' as never)
    .update({ removed_at: new Date().toISOString(), removed_by: ctx.userId } as never)
    .eq('id', assignmentId)
    .is('removed_at', null);

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'remove-position: UPDATE failed',
        code: error.code,
        error: error.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(supabase, ctx, {
    action: 'position.removed',
    entitySchema: 'core',
    entityTable: 'position_assignments',
    entityId: assignmentId,
    scopeId: row.scope_id,
    metadata: { memberId: row.member_id },
  });

  return withCors(req, success({ assignmentId, alreadyRemoved: false, traceId: ctx.traceId }));
}
