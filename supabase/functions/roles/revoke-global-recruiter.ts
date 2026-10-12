/**
 * Edge Function: revoke-global-recruiter
 *
 * Sets revoked_at / revoked_by on the user's active global recruiter
 * grant (scope_id IS NULL, role.key = 'recruiter', revoked_at IS NULL).
 * Requires `role.revoke` at Mainstream.
 *
 * Same audit-trigger delegation as revoke-role — the role_assignments
 * revocation trigger writes audit.audit_entries + core.role_history
 * automatically.
 */

import { z } from 'npm:zod@3.24.1';

import { withCors } from '../_shared/cors.ts';
import { forbidden, internalError, notFound, success, unauthorized } from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z.object({ userId: z.string().uuid() }).strict();

interface SuccessBody {
  assignmentId: string | null;
  alreadyRevoked: boolean;
  traceId: string;
}

export async function revokeGlobalRecruiter(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const { userId } = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  const { data: ms } = await supabase
    .schema('core' as never)
    .from('scopes' as never)
    .select('id')
    .eq('scope_type', 'mainstream')
    .maybeSingle();
  if (!ms) return withCors(req, internalError(ctx.traceId));
  const mainstreamId = (ms as { id: string }).id;

  const allowed = await authorize(supabase, ctx, { action: 'role.revoke', scopeId: mainstreamId });
  if (!allowed) {
    return withCors(req, forbidden('role.revoke', ctx.traceId, { scopeId: mainstreamId }));
  }

  // Locate the active global recruiter grant.
  const { data: role } = await supabase
    .schema('core' as never)
    .from('roles' as never)
    .select('id')
    .eq('key', 'recruiter')
    .maybeSingle();
  if (!role) return withCors(req, notFound('role', ctx.traceId));

  const { data: existing } = await supabase
    .schema('core' as never)
    .from('role_assignments' as never)
    .select('id')
    .eq('user_id', userId)
    .eq('role_id', (role as { id: string }).id)
    .is('scope_id', null)
    .is('revoked_at', null)
    .maybeSingle();

  if (!existing) {
    const body: SuccessBody = { assignmentId: null, alreadyRevoked: true, traceId: ctx.traceId };
    return withCors(req, success(body));
  }
  const assignmentId = (existing as { id: string }).id;

  const { error } = await supabase
    .schema('core' as never)
    .from('role_assignments' as never)
    .update({ revoked_at: new Date().toISOString(), revoked_by: ctx.userId } as never)
    .eq('id', assignmentId);

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'revoke-global-recruiter: UPDATE failed',
        code: error.code,
        error: error.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const body: SuccessBody = { assignmentId, alreadyRevoked: false, traceId: ctx.traceId };
  return withCors(req, success(body));
}
