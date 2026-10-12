/**
 * Edge Function: mark-member-passive
 *
 * Flips a membership's status from `active` → `passive`. Only valid on
 * geographic memberships (branch / autonomous chapter) — enforced by
 * the DB trigger `memberships_passive_shape_check` as well as here.
 *
 * Requires `membership.mark_passive` at the membership's scope.
 * Idempotent: an already-passive row returns 200.
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

const inputSchema = z.object({ membershipId: z.string().uuid() }).strict();

export async function markMemberPassive(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const { membershipId } = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  const { data: current } = await supabase
    .schema('core' as never)
    .from('memberships' as never)
    .select('id, scope_id, membership_status')
    .eq('id', membershipId)
    .maybeSingle();
  if (!current) return withCors(req, notFound('membership', ctx.traceId));
  const row = current as { scope_id: string; membership_status: string };

  const allowed = await authorize(supabase, ctx, {
    action: 'membership.mark_passive',
    scopeId: row.scope_id,
  });
  if (!allowed) {
    return withCors(
      req,
      forbidden('membership.mark_passive', ctx.traceId, { scopeId: row.scope_id }),
    );
  }

  if (row.membership_status === 'passive') {
    return withCors(
      req,
      success({ membershipId, status: 'passive', alreadyPassive: true, traceId: ctx.traceId }),
    );
  }
  if (row.membership_status !== 'active') {
    return withCors(
      req,
      conflict(
        'MEMBERSHIP_NOT_ACTIVE',
        `cannot mark passive from ${row.membership_status}`,
        ctx.traceId,
      ),
    );
  }

  const { error } = await supabase
    .schema('core' as never)
    .from('memberships' as never)
    .update({ membership_status: 'passive' } as never)
    .eq('id', membershipId)
    .eq('membership_status', 'active');

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'mark-member-passive: UPDATE failed',
        code: error.code,
        error: error.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(supabase, ctx, {
    action: 'membership.passive_marked',
    entitySchema: 'core',
    entityTable: 'memberships',
    entityId: membershipId,
    scopeId: row.scope_id,
  });

  return withCors(
    req,
    success({ membershipId, status: 'passive', alreadyPassive: false, traceId: ctx.traceId }),
  );
}
