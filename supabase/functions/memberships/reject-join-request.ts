/**
 * Edge Function: reject-join-request
 *
 * Transitions a `pending` membership row to `rejected`, stamping
 * rejected_at + rejected_by. Requires `membership.reject` at the
 * target scope.
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
import { createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z
  .object({
    membershipId: z.string().uuid(),
    reason: z.string().max(500).optional(),
  })
  .strict();

export async function rejectJoinRequest(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  const { data: current } = await supabase
    .schema('core' as never)
    .from('memberships' as never)
    .select('id, scope_id, membership_status')
    .eq('id', input.membershipId)
    .maybeSingle();
  if (!current) return withCors(req, notFound('membership', ctx.traceId));
  const row = current as { scope_id: string; membership_status: string };

  const allowed = await authorize(supabase, ctx, {
    action: 'membership.reject',
    scopeId: row.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('membership.reject', ctx.traceId, { scopeId: row.scope_id }));
  }

  if (row.membership_status !== 'pending') {
    return withCors(
      req,
      conflict(
        'MEMBERSHIP_NOT_PENDING',
        `cannot reject a membership in status ${row.membership_status}`,
        ctx.traceId,
      ),
    );
  }

  const { error } = await supabase
    .schema('core' as never)
    .from('memberships' as never)
    .update({
      membership_status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejected_by: ctx.userId,
    } as never)
    .eq('id', input.membershipId)
    .eq('membership_status', 'pending');

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'reject-join-request: UPDATE failed',
        code: error.code,
        error: error.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(supabase, ctx, {
    action: 'membership.rejected',
    entitySchema: 'core',
    entityTable: 'memberships',
    entityId: input.membershipId,
    scopeId: row.scope_id,
    metadata: { reason: input.reason ?? null },
  });

  return withCors(
    req,
    success({ membershipId: input.membershipId, status: 'rejected', traceId: ctx.traceId }),
  );
}
