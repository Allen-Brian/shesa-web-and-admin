/**
 * Action: audience/resolve
 *
 * POST /functions/v1/audience/resolve — returns the full list of member
 * IDs the caller's AudienceDefinition resolves to.
 *
 * This is the sibling of audience/count. Used by:
 *   - Server-side scripts / admin tools that want the resolved list
 *   - Debugging / sanity checks
 *
 * Note: the announcement publish path (Slice 4) does NOT invoke this
 * endpoint — it calls `exco.resolve_audience(jsonb)` RPC directly from
 * within the publish Edge Function to save the HTTP hop. This endpoint
 * exists for external / non-publish callers and for parity with count.
 *
 * Authorization: same as audience/count — `announcement.create` at the
 * passed scopeId.
 */

import { z } from 'npm:zod@3.24.1';

import { withCors } from '../_shared/cors.ts';
import { forbidden, internalError, success, unauthorized } from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z
  .object({
    scopeId: z.string().uuid(),
    audience: z.record(z.unknown()),
  })
  .strict();

interface SuccessBody {
  readonly memberIds: readonly string[];
  readonly count: number;
  readonly traceId: string;
}

export async function resolveAudience(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const userClient = createUserClient(ctx.jwt);

  const allowed = await authorize(userClient, ctx, {
    action: 'announcement.create',
    scopeId: input.scopeId,
  });
  if (!allowed) {
    return withCors(req, forbidden('announcement.create', ctx.traceId, { scopeId: input.scopeId }));
  }

  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .schema('exco' as never)
    .rpc('resolve_audience' as never, { def: input.audience } as never);

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'audience/resolve: RPC failed',
        code: error.code,
        error: error.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  // The RPC returns TABLE(member_id uuid) — supabase-js surfaces this
  // as an array of { member_id: string }.
  const rows = (data ?? []) as ReadonlyArray<{ member_id: string }>;
  const memberIds = rows.map((r) => r.member_id);

  const body: SuccessBody = {
    memberIds,
    count: memberIds.length,
    traceId: ctx.traceId,
  };
  return withCors(req, success(body));
}
