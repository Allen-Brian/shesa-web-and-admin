/**
 * Edge Function: grant-role
 *
 * Grants a role to a user at a scope. Single write authority per
 * ADR-0033 — apps, scripts, and (eventually) admin tooling all call
 * this same function rather than INSERTing directly. The audit trigger
 * on core.role_assignments handles writing audit.audit_entries +
 * core.role_history automatically, so this function doesn't call
 * audit.log_event itself — the data layer guarantees the trail.
 *
 * Auth model:
 *   - Caller must have a Supabase Auth JWT.
 *   - Caller must hold `role.grant` at the target scope (or any
 *     non-autonomous ancestor — has_permission walks the tree).
 *   - The INSERT runs under the caller's JWT so RLS is the second
 *     line of defense; if our policy module is wrong, RLS still
 *     blocks the write.
 *
 * Idempotency (per ADR-0015):
 *   - The partial UNIQUE INDEX on (user_id, scope_id, role_id) WHERE
 *     revoked_at IS NULL gives natural dedup for active assignments.
 *     A retried grant for the same triple returns 200 with the existing
 *     assignment id instead of duplicating.
 *   - The `x-idempotency-key` header is captured into the trace but
 *     not used for enforcement here — natural-key dedup is enough.
 *     A dedicated core.idempotency_keys table will arrive when an
 *     action without natural-key idempotency does (likely payments).
 */

import { z } from 'npm:zod@3.24.1';

import { handlePreflight, withCors } from '../_shared/cors.ts';
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

// Role keys mirror @shesa/types ROLE_KEYS — keep in sync.
const ROLE_KEYS = [
  'mainstream_admin',
  'branch_admin',
  'batch_admin',
  'finance',
  'editor',
  'recruiter',
  'announcer',
] as const;

const inputSchema = z
  .object({
    userId: z.string().uuid(),
    scopeId: z.string().uuid(),
    roleKey: z.enum(ROLE_KEYS),
    // Optional lifecycle window. starts_at defaults to NOW() in the
    // table; ends_at left null means "no expiration".
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

  if (!ctx.userId || !ctx.jwt) {
    return withCors(req, unauthorized(ctx.traceId));
  }

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);

  const input = parsed.data;
  const supabase = createUserClient(ctx.jwt);

  // ── Policy check first (ADR-0006 layer 2) ───────────────────────────
  const allowed = await authorize(supabase, ctx, {
    action: 'role.grant',
    scopeId: input.scopeId,
  });
  if (!allowed) {
    return withCors(req, forbidden('role.grant', ctx.traceId, { scopeId: input.scopeId }));
  }

  // ── Resolve roleKey → role.id ───────────────────────────────────────
  const { data: role, error: roleErr } = await supabase
    .from('roles' as never)
    .select('id')
    .eq('key', input.roleKey)
    .maybeSingle();

  if (roleErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'grant-role: failed to look up role.id',
        error: roleErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!role) {
    // roleKey is enum-validated but the DB hasn't been seeded with it
    // — surface as a clear 404 so the caller knows it's a seed issue,
    // not a permission issue.
    return withCors(req, notFound('role', ctx.traceId));
  }

  // ── INSERT (RLS is the second line of defense) ──────────────────────
  const { data: inserted, error: insertErr } = await supabase
    .from('role_assignments' as never)
    .insert({
      user_id: input.userId,
      scope_id: input.scopeId,
      role_id: (role as { id: string }).id,
      granted_by: ctx.userId,
      starts_at: input.startsAt ?? null,
      ends_at: input.endsAt ?? null,
    } as never)
    .select('id')
    .maybeSingle();

  if (insertErr) {
    // 23505 = unique_violation. The partial unique index says an active
    // assignment for this (user, scope, role) already exists — that's
    // an idempotent success, so resolve and return the existing id.
    if (insertErr.code === '23505') {
      const existing = await supabase
        .from('role_assignments' as never)
        .select('id')
        .eq('user_id', input.userId)
        .eq('scope_id', input.scopeId)
        .eq('role_id', (role as { id: string }).id)
        .is('revoked_at', null)
        .maybeSingle();

      if (existing.data) {
        const body: SuccessBody = {
          assignmentId: (existing.data as { id: string }).id,
          alreadyExisted: true,
          traceId: ctx.traceId,
        };
        return withCors(req, success(body));
      }

      // Unique violation but we can't find the live row — race
      // condition or weird state. Surface as conflict; let the caller
      // retry.
      return withCors(
        req,
        conflict('ROLE_GRANT_CONFLICT', 'Concurrent grant detected; retry', ctx.traceId),
      );
    }

    // 42501 = insufficient_privilege, i.e. RLS rejected. Our authorize
    // check passed — this means RLS is stricter than the policy module
    // (a real bug). Log + 500.
    if (insertErr.code === '42501') {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'grant-role: RLS rejected after policy allowed (mismatch bug)',
          userId: input.userId,
          scopeId: input.scopeId,
          roleKey: input.roleKey,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }

    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'grant-role: INSERT failed',
        code: insertErr.code,
        error: insertErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  // The audit trigger on role_assignments has already written
  // audit.audit_entries + core.role_history rows. No extra logEvent
  // call needed here — that's the property of the data-layer audit
  // trigger (E4).

  const body: SuccessBody = {
    assignmentId: (inserted as { id: string }).id,
    alreadyExisted: false,
    traceId: ctx.traceId,
  };
  return withCors(req, success(body, 201));
});
