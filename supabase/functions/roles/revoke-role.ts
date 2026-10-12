/**
 * Edge Function: revoke-role
 *
 * Revokes an active role assignment. Same write-authority pattern as
 * grant-role (ADR-0033). The audit trigger handles the
 * audit.audit_entries + core.role_history writes; this function just
 * flips revoked_at + revoked_by.
 *
 * Auth model:
 *   - Caller must have a Supabase Auth JWT.
 *   - Caller must hold `role.revoke` at the assignment's scope.
 *   - The UPDATE runs under the caller's JWT — RLS is the second
 *     line of defense.
 *
 * Idempotency:
 *   - Already-revoked assignments return 200 with alreadyRevoked=true.
 *     The UPDATE's WHERE revoked_at IS NULL clause is the natural-key
 *     idempotency — a retried revoke matches zero rows the second
 *     time, which we then resolve as "fine, already done."
 */

import { z } from 'npm:zod@3.24.1';

import { withCors } from '../_shared/cors.ts';
import { forbidden, internalError, notFound, success, unauthorized } from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z
  .object({
    assignmentId: z.string().uuid(),
  })
  .strict();

interface SuccessBody {
  assignmentId: string;
  alreadyRevoked: boolean;
  traceId: string;
}

interface AssignmentRow {
  id: string;
  scope_id: string;
  revoked_at: string | null;
}

export async function revokeRole(req: Request): Promise<Response> {
  const ctx = buildContext(req);

  if (!ctx.userId || !ctx.jwt) {
    return withCors(req, unauthorized(ctx.traceId));
  }

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);

  const supabase = createUserClient(ctx.jwt);

  // ── Look up the assignment (need scope_id for the policy check) ────
  const { data: row, error: lookupErr } = await supabase
    .schema('core' as never)
    .from('role_assignments' as never)
    .select('id, scope_id, revoked_at')
    .eq('id', parsed.data.assignmentId)
    .maybeSingle();

  if (lookupErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'revoke-role: assignment lookup failed',
        error: lookupErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!row) {
    // The row may genuinely not exist, OR RLS hid it from the caller.
    // Either way: 404 is the safe response — we don't want to leak
    // assignment existence to callers who can't see it.
    return withCors(req, notFound('role_assignment', ctx.traceId));
  }

  const assignment = row as AssignmentRow;

  // ── Policy: role.revoke at the assignment's scope ──────────────────
  const allowed = await authorize(supabase, ctx, {
    action: 'role.revoke',
    scopeId: assignment.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('role.revoke', ctx.traceId, { scopeId: assignment.scope_id }));
  }

  // ── Idempotent: already revoked → 200 ──────────────────────────────
  if (assignment.revoked_at !== null) {
    const body: SuccessBody = {
      assignmentId: assignment.id,
      alreadyRevoked: true,
      traceId: ctx.traceId,
    };
    return withCors(req, success(body));
  }

  // ── UPDATE — the audit trigger captures the change ─────────────────
  const { error: updateErr } = await supabase
    .schema('core' as never)
    .from('role_assignments' as never)
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: ctx.userId,
    } as never)
    .eq('id', assignment.id)
    // WHERE revoked_at IS NULL guards against a concurrent revoke
    // racing us — the second update touches 0 rows, no harm done.
    .is('revoked_at', null);

  if (updateErr) {
    if (updateErr.code === '42501') {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'revoke-role: RLS rejected after policy allowed (mismatch bug)',
          assignmentId: assignment.id,
          scopeId: assignment.scope_id,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }

    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'revoke-role: UPDATE failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const body: SuccessBody = {
    assignmentId: assignment.id,
    alreadyRevoked: false,
    traceId: ctx.traceId,
  };
  return withCors(req, success(body));
}
