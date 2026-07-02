/**
 * Edge Function: assign-position
 *
 * Assigns a position (badge) to a member at a scope. Requires
 * `position.assign` at the scope. Badges are titles, not authority
 * — the `position_president_prompt` trigger fires an in-app
 * notification if a President is assigned to a member without Admin,
 * but no auto-grant happens (§13 Epic 1.6 UX helper).
 *
 * Idempotent: existing active assignment for the same (member, scope,
 * position) returns 200 with alreadyExisted=true.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { handlePreflight, withCors } from '../_shared/cors.ts';
import {
  conflict,
  forbidden,
  internalError,
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
    positionCatalogId: z.string().uuid(),
    customTitle: z.string().max(200).nullish(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().nullable().optional(),
  })
  .strict();

interface SuccessBody {
  assignmentId: string;
  alreadyExisted: boolean;
  traceId: string;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  const allowed = await authorize(supabase, ctx, {
    action: 'position.assign',
    scopeId: input.scopeId,
  });
  if (!allowed) {
    return withCors(req, forbidden('position.assign', ctx.traceId, { scopeId: input.scopeId }));
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('position_assignments' as never)
    .insert({
      member_id: input.memberId,
      scope_id: input.scopeId,
      position_catalog_id: input.positionCatalogId,
      custom_title: input.customTitle ?? null,
      starts_at: input.startsAt ?? new Date().toISOString(),
      ends_at: input.endsAt ?? null,
      assigned_by: ctx.userId,
    } as never)
    .select('id')
    .maybeSingle();

  if (insertErr) {
    if (insertErr.code === '23505') {
      const existing = await supabase
        .from('position_assignments' as never)
        .select('id')
        .eq('member_id', input.memberId)
        .eq('scope_id', input.scopeId)
        .eq('position_catalog_id', input.positionCatalogId)
        .is('removed_at', null)
        .maybeSingle();
      if (existing.data) {
        const body: SuccessBody = {
          assignmentId: (existing.data as { id: string }).id,
          alreadyExisted: true,
          traceId: ctx.traceId,
        };
        return withCors(req, success(body));
      }
      return withCors(
        req,
        conflict('POSITION_ASSIGN_CONFLICT', 'concurrent assignment; retry', ctx.traceId),
      );
    }
    if (insertErr.code === '23514') {
      return withCors(
        req,
        validationError('Position assignment violates a schema invariant', ctx.traceId, {
          _: insertErr.message,
        }),
      );
    }
    if (insertErr.code === '23503') {
      return withCors(
        req,
        validationError('Referenced member/scope/catalog not found', ctx.traceId, {
          _: insertErr.message,
        }),
      );
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'assign-position: INSERT failed',
        code: insertErr.code,
        error: insertErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const assignmentId = (inserted as { id: string }).id;

  await logEvent(supabase, ctx, {
    action: 'position.assigned',
    entitySchema: 'core',
    entityTable: 'position_assignments',
    entityId: assignmentId,
    scopeId: input.scopeId,
    metadata: {
      memberId: input.memberId,
      positionCatalogId: input.positionCatalogId,
      customTitle: input.customTitle ?? null,
    },
  });

  return withCors(
    req,
    success({ assignmentId, alreadyExisted: false, traceId: ctx.traceId } as SuccessBody, 201),
  );
});
