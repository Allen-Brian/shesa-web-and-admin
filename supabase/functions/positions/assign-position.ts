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
import { withCors } from '../_shared/cors.ts';
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

export async function assignPosition(req: Request): Promise<Response> {
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
    .schema('core' as never)
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
      // First check: does the same (member, scope, position) already exist?
      // If so this is a re-click; return idempotent success.
      const existingSame = await supabase
        .schema('core' as never)
        .from('position_assignments' as never)
        .select('id')
        .eq('member_id', input.memberId)
        .eq('scope_id', input.scopeId)
        .eq('position_catalog_id', input.positionCatalogId)
        .is('removed_at', null)
        .maybeSingle();
      if (existingSame.data) {
        const body: SuccessBody = {
          assignmentId: (existingSame.data as { id: string }).id,
          alreadyExisted: true,
          traceId: ctx.traceId,
        };
        return withCors(req, success(body));
      }

      // 2026-07-02 tightened the uniqueness to (member_id, scope_id) —
      // a member can only hold ONE active position per scope. If the
      // member already holds a DIFFERENT position here, that's not a
      // race — it's an operator error we can name specifically.
      const existingOther = await supabase
        .schema('core' as never)
        .from('position_assignments' as never)
        .select('id, position_catalog_id')
        .eq('member_id', input.memberId)
        .eq('scope_id', input.scopeId)
        .is('removed_at', null)
        .maybeSingle();
      if (existingOther.data) {
        return withCors(
          req,
          conflict(
            'POSITION_ALREADY_HELD',
            'This member already holds a position at this scope. Remove the current one first.',
            ctx.traceId,
          ),
        );
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
    // 42501 = insufficient_privilege. Historically surfaced when the
    // AFTER-INSERT president-prompt trigger tried to write into
    // notifications.notification_events without SECURITY DEFINER (see
    // migration 20260706200000). Handle it explicitly so the operator
    // gets a real message instead of "unexpected error occurred".
    if (insertErr.code === '42501') {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message:
            'assign-position: 42501 during INSERT — likely a trigger writing to a table the caller cannot INSERT into. Apply migration 20260706200000_restore_position_prompt_security_definer.sql.',
          code: insertErr.code,
          error: insertErr.message,
        }),
      );
      return withCors(
        req,
        conflict(
          'POSITION_ASSIGN_TRIGGER_DENIED',
          'Position could not be recorded because a downstream trigger was denied by the database. Ask an admin to apply the latest migrations.',
          ctx.traceId,
        ),
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
}
