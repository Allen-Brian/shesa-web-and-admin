/**
 * Edge Function: request-join-body
 *
 * A member (self-service) OR an admin creates a `pending` membership
 * row against a target geographic scope. If the caller has
 * `membership.approve` at the scope AND `adminAdded=true`, the row
 * is created as `active` directly (an admin-added flow).
 *
 * Ownership: for the self-service path, the caller's linked member
 * row IS the target (via member_accounts). For the admin path, the
 * caller passes memberId explicitly.
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
    scopeId: z.string().uuid(),
    adminAdded: z.boolean().optional(),
  })
  .strict();

interface SuccessBody {
  membershipId: string;
  status: 'pending' | 'active';
  traceId: string;
}

export async function requestJoinBody(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  // Admin-added flow: bypass the "own row" gate but require membership.approve.
  if (input.adminAdded) {
    const allowed = await authorize(supabase, ctx, {
      action: 'membership.approve',
      scopeId: input.scopeId,
    });
    if (!allowed) {
      return withCors(
        req,
        forbidden('membership.approve', ctx.traceId, { scopeId: input.scopeId }),
      );
    }
  } else {
    // Self-service: the caller must own the target member row.
    const { data: ownership } = await supabase
      .schema('core' as never)
      .rpc('member_owned_by' as never, {
        p_member_id: input.memberId,
        p_user_id: ctx.userId,
      });
    if (ownership !== true) {
      return withCors(
        req,
        forbidden('self-service join requires ownership of the member', ctx.traceId, {
          memberId: input.memberId,
        }),
      );
    }
  }

  // Detect an already-existing pending / active row for the same
  // (member, scope) — idempotent short-circuit.
  const { data: existing } = await supabase
    .schema('core' as never)
    .from('memberships' as never)
    .select('id, membership_status')
    .eq('member_id', input.memberId)
    .eq('scope_id', input.scopeId)
    .in('membership_status', ['pending', 'active', 'passive'])
    .maybeSingle();
  if (existing) {
    const e = existing as { id: string; membership_status: 'pending' | 'active' | 'passive' };
    return withCors(
      req,
      success({
        membershipId: e.id,
        status: e.membership_status === 'passive' ? 'active' : e.membership_status,
        traceId: ctx.traceId,
      } as SuccessBody),
    );
  }

  const insertShape = {
    member_id: input.memberId,
    scope_id: input.scopeId,
    membership_status: input.adminAdded ? 'active' : 'pending',
    join_method: input.adminAdded ? 'admin_added' : 'self_request',
    joined_at: input.adminAdded ? new Date().toISOString() : null,
    approved_at: input.adminAdded ? new Date().toISOString() : null,
    approved_by: input.adminAdded ? ctx.userId : null,
  };

  const { data: inserted, error: insertErr } = await supabase
    .schema('core' as never)
    .from('memberships' as never)
    .insert(insertShape as never)
    .select('id, membership_status')
    .maybeSingle();

  if (insertErr) {
    if (insertErr.code === '23505') {
      // Partial-unique conflict: a second active/passive geographic membership.
      return withCors(
        req,
        conflict(
          'MEMBERSHIP_ALREADY_ACTIVE',
          'Member already has an active/passive geographic membership elsewhere; use request-transfer instead',
          ctx.traceId,
        ),
      );
    }
    if (insertErr.code === '23514') {
      return withCors(
        req,
        validationError('Membership violates a shape invariant', ctx.traceId, {
          _: insertErr.message,
        }),
      );
    }
    if (insertErr.code === '23503') {
      return withCors(req, notFound('member_or_scope', ctx.traceId));
    }
    if (insertErr.code === '42501') {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'request-join-body: RLS rejected after policy allowed',
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'request-join-body: INSERT failed',
        code: insertErr.code,
        error: insertErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const row = inserted as { id: string; membership_status: 'pending' | 'active' };

  await logEvent(supabase, ctx, {
    action: input.adminAdded ? 'membership.approved' : 'membership.requested',
    entitySchema: 'core',
    entityTable: 'memberships',
    entityId: row.id,
    scopeId: input.scopeId,
    metadata: { memberId: input.memberId, adminAdded: input.adminAdded === true },
  });

  return withCors(
    req,
    success(
      { membershipId: row.id, status: row.membership_status, traceId: ctx.traceId } as SuccessBody,
      201,
    ),
  );
}
