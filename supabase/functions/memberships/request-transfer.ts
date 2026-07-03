/**
 * Edge Function: request-transfer
 *
 * Creates a `pending` `core.membership_transfers` row for a member.
 * Requires `membership.transfer` at the SOURCE scope. The destination
 * admin sees the request under RLS via the destination-side clause,
 * which surfaces it in their Requests & Transfers tab (M4).
 *
 * Idempotent: if a pending transfer already exists for the same
 * member, returns 200 with the existing id.
 *
 * 2026-07-03 (M1 note): the destination admin is IMPLICITLY notified
 * by the request appearing in their RLS-scoped queue. An explicit
 * `notify_destination_of_transfer_request` fan-out would be redundant
 * with that queue and is deferred; the source-side notification on
 * approve-transfer (via `core.notify_source_of_transfer`) is the
 * asymmetric case that actually needs push because the source has no
 * queue to poll.
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
import { createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z
  .object({
    memberId: z.string().uuid(),
    sourceScopeId: z.string().uuid(),
    destinationScopeId: z.string().uuid(),
    reason: z.string().max(500).optional(),
  })
  .strict();

export async function requestTransfer(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  if (input.sourceScopeId === input.destinationScopeId) {
    return withCors(
      req,
      validationError('source and destination must differ', ctx.traceId, {
        destinationScopeId: 'same as source',
      }),
    );
  }

  const supabase = createUserClient(ctx.jwt);

  // Validate destination shape at the app layer for a nicer 422 than
  // a raw check_violation from the transfer atomicity path later.
  const { data: destShape } = await supabase
    .schema('core' as never)
    .from('scopes' as never)
    .select('scope_type, chapter_kind')
    .eq('id', input.destinationScopeId)
    .maybeSingle();
  if (!destShape) return withCors(req, notFound('destination_scope', ctx.traceId));
  const d = destShape as { scope_type: string; chapter_kind: string | null };
  const destIsGeographic =
    d.scope_type === 'branch' || (d.scope_type === 'chapter' && d.chapter_kind === 'autonomous');
  if (!destIsGeographic) {
    return withCors(
      req,
      validationError('destination must be a branch or autonomous chapter', ctx.traceId, {
        destinationScopeId: `${d.scope_type}${d.chapter_kind ? '/' + d.chapter_kind : ''}`,
      }),
    );
  }

  const allowed = await authorize(supabase, ctx, {
    action: 'membership.transfer',
    scopeId: input.sourceScopeId,
  });
  if (!allowed) {
    return withCors(
      req,
      forbidden('membership.transfer', ctx.traceId, { scopeId: input.sourceScopeId }),
    );
  }

  // Idempotent short-circuit — one pending transfer per member (unique index).
  const { data: existing } = await supabase
    .from('membership_transfers' as never)
    .select('id')
    .eq('member_id', input.memberId)
    .eq('status', 'pending')
    .maybeSingle();
  if (existing) {
    return withCors(
      req,
      success({
        transferId: (existing as { id: string }).id,
        alreadyExists: true,
        traceId: ctx.traceId,
      }),
    );
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('membership_transfers' as never)
    .insert({
      member_id: input.memberId,
      source_scope_id: input.sourceScopeId,
      destination_scope_id: input.destinationScopeId,
      requested_by: ctx.userId,
      reason: input.reason ?? null,
    } as never)
    .select('id')
    .maybeSingle();

  if (insertErr) {
    if (insertErr.code === '23505') {
      return withCors(
        req,
        conflict(
          'TRANSFER_PENDING',
          'A pending transfer already exists for this member',
          ctx.traceId,
        ),
      );
    }
    if (insertErr.code === '23514') {
      return withCors(
        req,
        validationError('Transfer violates a shape invariant', ctx.traceId, {
          _: insertErr.message,
        }),
      );
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'request-transfer: INSERT failed',
        code: insertErr.code,
        error: insertErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const transferId = (inserted as { id: string }).id;

  await logEvent(supabase, ctx, {
    action: 'membership.transfer_requested',
    entitySchema: 'core',
    entityTable: 'membership_transfers',
    entityId: transferId,
    scopeId: input.sourceScopeId,
    metadata: { memberId: input.memberId, destinationScopeId: input.destinationScopeId },
  });

  return withCors(req, success({ transferId, alreadyExists: false, traceId: ctx.traceId }, 201));
}
