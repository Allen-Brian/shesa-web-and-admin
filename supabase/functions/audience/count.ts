/**
 * Action: audience/count
 *
 * POST /functions/v1/audience/count — returns the number of members the
 * caller's AudienceDefinition currently resolves to. Backs the live
 * "reaches ~N members" preview on the AudienceSelector UI while an admin
 * is authoring an announcement or event.
 *
 * The heavy lifting is `exco.count_audience(jsonb)` — this handler owns
 * auth + input validation. See the SQL function's header for the
 * combination-rule semantics.
 *
 * Authorization: caller must have `announcement.create` at the passed
 * scopeId. That's the proxy for "you have publish authority somewhere,
 * so you can preview audiences." Once events land they can widen to
 * "announcement.create OR event.create" if a persona is events-only.
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
    // The audience definition. Not deep-validated here — we trust the
    // Server Action that called us (which validated via
    // packages/domain/audience/). The SQL resolver enforces mode
    // sanity and short-circuits on nonsense payloads. Keeping the
    // parse cheap here matters — this endpoint fires on every filter
    // change in the UI.
    audience: z.record(z.unknown()),
  })
  .strict();

interface SuccessBody {
  readonly count: number;
  readonly traceId: string;
}

export async function countAudience(req: Request): Promise<Response> {
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

  // The count RPC lives in the exco schema and is granted only to
  // service_role — use the service-role client.
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .schema('exco' as never)
    .rpc('count_audience' as never, { def: input.audience } as never);

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'audience/count: RPC failed',
        code: error.code,
        error: error.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const body: SuccessBody = {
    count: typeof data === 'number' ? data : 0,
    traceId: ctx.traceId,
  };
  return withCors(req, success(body));
}
