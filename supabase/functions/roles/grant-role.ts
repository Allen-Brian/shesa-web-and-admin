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

// Role keys mirror @shesa/types ROLE_KEYS — keep in sync.
// `batch_admin` was retired 2026-07-05.
const ROLE_KEYS = [
  'mainstream_admin',
  'branch_admin',
  'finance',
  'editor',
  'recruiter',
  'announcer',
] as const;

const inputSchema = z
  .object({
    userId: z.string().uuid(),
    // scopeId is nullable — a NULL scope means the grant is global.
    // Only the `recruiter` role is allowed to be granted globally
    // (§2.17); the check runs below in the handler once we've
    // resolved the role key.
    scopeId: z.string().uuid().nullable(),
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

async function resolveMainstreamScopeId(
  supabase: ReturnType<typeof createUserClient>,
): Promise<string | null> {
  const { data } = await supabase
    .schema('core' as never)
    .from('scopes' as never)
    .select('id')
    .eq('scope_type', 'mainstream')
    .maybeSingle();
  return data ? (data as { id: string }).id : null;
}

async function checkSixHolderCap(
  supabase: ReturnType<typeof createUserClient>,
  scopeId: string,
): Promise<boolean> {
  // Count admin+finance role assignments at the scope that are active
  // AND not revoked AND within their lifecycle window. Mirrors the
  // logic in core.enforce_six_holder_cap so a user-visible 409 fires
  // before the DB backstop raises 23514.
  const { data, error } = await supabase
    .schema('core' as never)
    .from('role_assignments' as never)
    .select('id, roles!inner(key)', { count: 'exact', head: true })
    .is('revoked_at', null)
    .eq('scope_id', scopeId)
    .lte('starts_at', new Date().toISOString())
    .or('ends_at.is.null,ends_at.gt.' + new Date().toISOString())
    .in('roles.key', ['mainstream_admin', 'branch_admin', 'finance']);
  if (error) {
    // Fail open here — the trigger is the definitive gate, and a
    // spurious 500 on a benign grant is worse UX than a rare
    // trigger-side 23514.
    return true;
  }
  const count = (data as unknown as { length?: number } | null)?.length ?? 0;
  return count < 6;
}

export async function grantRole(req: Request): Promise<Response> {
  const ctx = buildContext(req);

  if (!ctx.userId || !ctx.jwt) {
    return withCors(req, unauthorized(ctx.traceId));
  }

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);

  const input = parsed.data;
  const supabase = createUserClient(ctx.jwt);

  // ── Global-grant guard (§2.17) ──────────────────────────────────────
  // A NULL scope_id is only legal for the `recruiter` role. For any
  // other role, missing scope is a validation error (a common client
  // bug we surface with a clear message rather than an opaque
  // downstream failure).
  if (input.scopeId === null && input.roleKey !== 'recruiter') {
    return withCors(
      req,
      forbidden('global grants only allowed for recruiter', ctx.traceId, {
        roleKey: input.roleKey,
      }),
    );
  }

  // ── Policy check first (ADR-0006 layer 2) ───────────────────────────
  // For scoped grants: check role.grant at the target scope.
  // For global grants: check role.grant at Mainstream (only mainstream
  // admins may hand out global grants).
  const gateScopeId = input.scopeId ?? (await resolveMainstreamScopeId(supabase));
  if (!gateScopeId) {
    return withCors(req, internalError(ctx.traceId));
  }
  const allowed = await authorize(supabase, ctx, {
    action: 'role.grant',
    scopeId: gateScopeId,
  });
  if (!allowed) {
    return withCors(req, forbidden('role.grant', ctx.traceId, { scopeId: gateScopeId }));
  }

  // ── Six-holder cap fast-fail (Phase 1 §2.18) ────────────────────────
  // Only applies to admin/finance keys at a real scope. Recruiter and
  // global grants are exempt (the DB trigger has the same short-circuit
  // logic; this is the friendly 409 UX path).
  if (
    input.scopeId !== null &&
    (input.roleKey === 'mainstream_admin' ||
      input.roleKey === 'branch_admin' ||
      input.roleKey === 'finance')
  ) {
    const capOk = await checkSixHolderCap(supabase, input.scopeId);
    if (!capOk) {
      return withCors(
        req,
        conflict('CAP_EXCEEDED', 'admin+finance cap of 6 exceeded at this scope', ctx.traceId),
      );
    }
  }

  // ── Resolve roleKey → role.id ───────────────────────────────────────
  const { data: role, error: roleErr } = await supabase
    .schema('core' as never)
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
    .schema('core' as never)
    .from('role_assignments' as never)
    .insert({
      user_id: input.userId,
      scope_id: input.scopeId,
      role_id: (role as { id: string }).id,
      granted_by: ctx.userId,
      // Only include starts_at/ends_at when set — sending explicit NULL
      // trips the NOT NULL on starts_at instead of falling back to the
      // DB DEFAULT NOW().
      ...(input.startsAt ? { starts_at: input.startsAt } : {}),
      ...(input.endsAt ? { ends_at: input.endsAt } : {}),
    } as never)
    .select('id')
    .maybeSingle();

  if (insertErr) {
    // 23514 with CAP_EXCEEDED marker → trigger backstop fired. Surface
    // to the caller as the same 409 the app-level fast-fail would have.
    if (insertErr.code === '23514' && insertErr.message?.startsWith('CAP_EXCEEDED')) {
      return withCors(
        req,
        conflict('CAP_EXCEEDED', 'admin+finance cap of 6 exceeded at this scope', ctx.traceId),
      );
    }
    // 23505 = unique_violation. The partial unique index says an active
    // assignment for this (user, scope, role) already exists — that's
    // an idempotent success, so resolve and return the existing id.
    if (insertErr.code === '23505') {
      let query = supabase
        .schema('core' as never)
        .from('role_assignments' as never)
        .select('id')
        .eq('user_id', input.userId)
        .eq('role_id', (role as { id: string }).id)
        .is('revoked_at', null);
      // NULLS NOT DISTINCT: a NULL scope_id matches only NULL scope_id.
      // Postgres-js .eq(null) filters incorrectly, so branch here.
      query =
        input.scopeId === null ? query.is('scope_id', null) : query.eq('scope_id', input.scopeId);
      const existing = await query.maybeSingle();

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
}
