/**
 * Edge Function: grant-global-recruiter
 *
 * Thin wrapper around the same INSERT path as grant-role, hard-forcing:
 *   - role_key = 'recruiter'
 *   - scope_id = NULL   (global grant per §2.17)
 *
 * Requires `role.grant` at Mainstream (only Mainstream admins hand out
 * global grants). Same idempotent + audit behavior as grant-role.
 *
 * Kept as its own function (not a query param on grant-role) so:
 *   1. The intent is discoverable in the API surface.
 *   2. Permission gates live in one place per function — no branching
 *      on "did the caller ask for a global grant, and if so use a
 *      different scope".
 *   3. Audit action key can be distinct if we ever want to filter
 *      "who's handing out global recruiter" in logs.
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

const inputSchema = z.object({ userId: z.string().uuid() }).strict();

interface SuccessBody {
  assignmentId: string;
  alreadyExisted: boolean;
  traceId: string;
}

export async function grantGlobalRecruiter(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const { userId } = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  // Locate Mainstream — the gate scope for global grants.
  const { data: ms } = await supabase
    .schema('core' as never)
    .from('scopes' as never)
    .select('id')
    .eq('scope_type', 'mainstream')
    .maybeSingle();
  if (!ms) return withCors(req, internalError(ctx.traceId));
  const mainstreamId = (ms as { id: string }).id;

  const allowed = await authorize(supabase, ctx, { action: 'role.grant', scopeId: mainstreamId });
  if (!allowed) {
    return withCors(req, forbidden('role.grant', ctx.traceId, { scopeId: mainstreamId }));
  }

  const { data: role } = await supabase
    .schema('core' as never)
    .from('roles' as never)
    .select('id')
    .eq('key', 'recruiter')
    .maybeSingle();
  if (!role) return withCors(req, notFound('role', ctx.traceId));
  const roleId = (role as { id: string }).id;

  // INSERT with scope_id = NULL. The partial UNIQUE index uses NULLS
  // NOT DISTINCT, so a second global recruiter grant for the same
  // user collapses to an idempotent existing-row lookup below.
  const { data: inserted, error: insertErr } = await supabase
    .schema('core' as never)
    .from('role_assignments' as never)
    .insert({
      user_id: userId,
      scope_id: null,
      role_id: roleId,
      granted_by: ctx.userId,
    } as never)
    .select('id')
    .maybeSingle();

  if (insertErr) {
    if (insertErr.code === '23505') {
      const existing = await supabase
        .schema('core' as never)
        .from('role_assignments' as never)
        .select('id')
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .is('scope_id', null)
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
      return withCors(
        req,
        conflict('ROLE_GRANT_CONFLICT', 'Concurrent global grant; retry', ctx.traceId),
      );
    }
    if (insertErr.code === '42501') {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'grant-global-recruiter: RLS rejected after policy allowed',
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'grant-global-recruiter: INSERT failed',
        code: insertErr.code,
        error: insertErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const body: SuccessBody = {
    assignmentId: (inserted as { id: string }).id,
    alreadyExisted: false,
    traceId: ctx.traceId,
  };
  return withCors(req, success(body, 201));
}
