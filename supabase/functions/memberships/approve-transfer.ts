/**
 * Edge Function: approve-transfer
 *
 * Approves a pending `membership_transfers` row. Delegates the atomic
 * source-close + destination-open + request-update to the
 * `core.perform_transfer` Postgres function (SECURITY DEFINER,
 * see the memberships migration).
 *
 * Requires `membership.transfer` at the SOURCE scope — per §2.14,
 * the source body admin approves.
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

const inputSchema = z.object({ transferId: z.string().uuid() }).strict();

export async function approveTransfer(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const { transferId } = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  const { data: transfer } = await supabase
    .from('membership_transfers' as never)
    .select('id, member_id, source_scope_id, destination_scope_id, status')
    .eq('id', transferId)
    .maybeSingle();

  if (!transfer) return withCors(req, notFound('transfer', ctx.traceId));
  const t = transfer as {
    member_id: string;
    source_scope_id: string;
    destination_scope_id: string;
    status: string;
  };

  if (t.status !== 'pending') {
    return withCors(
      req,
      conflict(
        'TRANSFER_NOT_PENDING',
        `cannot approve a transfer in status ${t.status}`,
        ctx.traceId,
      ),
    );
  }

  const allowed = await authorize(supabase, ctx, {
    action: 'membership.transfer',
    scopeId: t.source_scope_id,
  });
  if (!allowed) {
    return withCors(
      req,
      forbidden('membership.transfer', ctx.traceId, { scopeId: t.source_scope_id }),
    );
  }

  // Locate the source active membership.
  const { data: sourceMembership } = await supabase
    .schema('core' as never)
    .from('memberships' as never)
    .select('id')
    .eq('member_id', t.member_id)
    .eq('scope_id', t.source_scope_id)
    .in('membership_status', ['active', 'passive'])
    .maybeSingle();
  if (!sourceMembership) {
    return withCors(req, notFound('source_membership', ctx.traceId));
  }

  const { data: newId, error: rpcErr } = await supabase
    .schema('core' as never)
    .rpc('perform_transfer' as never, {
      p_source_membership_id: (sourceMembership as { id: string }).id,
      p_destination_scope_id: t.destination_scope_id,
      p_approved_by: ctx.userId,
      p_transfer_request_id: transferId,
    });

  if (rpcErr) {
    // Most likely a partial-unique on the destination side — the
    // member somehow has another active membership at the destination
    // already. Surface as conflict.
    if (rpcErr.code === '23505') {
      return withCors(
        req,
        conflict(
          'DESTINATION_ALREADY_ACTIVE',
          'Destination already holds an active/passive membership for this member',
          ctx.traceId,
        ),
      );
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'approve-transfer: perform_transfer failed',
        code: rpcErr.code,
        error: rpcErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(supabase, ctx, {
    action: 'membership.transferred',
    entitySchema: 'core',
    entityTable: 'membership_transfers',
    entityId: transferId,
    scopeId: t.destination_scope_id,
    metadata: {
      memberId: t.member_id,
      sourceScopeId: t.source_scope_id,
      destinationScopeId: t.destination_scope_id,
      newMembershipId: newId,
    },
  });

  return withCors(req, success({ transferId, newMembershipId: newId, traceId: ctx.traceId }));
}
