/**
 * Action: create-network
 *
 * Handler for POST /functions/v1/networks/create-network. Grouped under
 * the `networks/` entity folder per the 2026-07-03 Edge Function reorg;
 * dispatched by `networks/index.ts` via `entityRouter`.
 *
 * The atomic scopes + networks write lives in `core.create_network()`
 * (SECURITY DEFINER). This handler owns auth + input validation + the
 * audit envelope.
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
} from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z
  .object({
    name: z.string().min(1).max(200),
    slug: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case ASCII'),
    shortName: z.string().min(1).max(40),
    description: z.string().max(2000).nullish(),
    icon: z.string().max(80).nullish(),
    colorHex: z
      .string()
      .regex(
        /^#[0-9a-f]{3}([0-9a-f]{3}([0-9a-f]{2})?)?$/i,
        'colorHex must be a #RGB / #RRGGBB / #RRGGBBAA value',
      )
      .nullish(),
    sortOrder: z.number().int().min(0).max(999).default(0),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

interface SuccessBody {
  scopeId: string;
  traceId: string;
}

export async function createNetwork(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  const { data: mainstream } = await supabase
    .schema('core' as never)
    .from('scopes')
    .select('id')
    .eq('scope_type', 'mainstream')
    .maybeSingle();
  if (!mainstream) return withCors(req, notFound('mainstream_scope', ctx.traceId));
  const mainstreamId = (mainstream as { id: string }).id;

  const allowed = await authorize(supabase, ctx, {
    action: 'scope.create',
    scopeId: mainstreamId,
  });
  if (!allowed) {
    return withCors(req, forbidden('scope.create', ctx.traceId, { scopeId: mainstreamId }));
  }

  const { data: scopeId, error: rpcErr } = await supabase.schema('core' as never).rpc(
    'create_network' as never,
    {
      p_name: input.name,
      p_slug: input.slug,
      p_short_name: input.shortName,
      p_description: input.description ?? null,
      p_icon: input.icon ?? null,
      p_color_hex: input.colorHex ?? null,
      p_sort_order: input.sortOrder,
      p_metadata: input.metadata,
    } as never,
  );

  if (rpcErr) {
    if (rpcErr.code === '23505') {
      const detail = String(rpcErr.details ?? rpcErr.message ?? '');
      const isShortName = detail.toLowerCase().includes('short_name');
      return withCors(
        req,
        conflict(
          isShortName ? 'SHORT_NAME_TAKEN' : 'SLUG_TAKEN',
          isShortName
            ? 'Another network already uses that short name.'
            : 'Another network already uses that slug.',
          ctx.traceId,
        ),
      );
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'networks/create-network: RPC failed',
        code: rpcErr.code,
        error: rpcErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const newScopeId = String(scopeId);

  await logEvent(supabase, ctx, {
    action: 'network.created',
    entitySchema: 'core',
    entityTable: 'scopes',
    entityId: newScopeId,
    scopeId: newScopeId,
    metadata: { name: input.name, shortName: input.shortName },
  });

  const body: SuccessBody = { scopeId: newScopeId, traceId: ctx.traceId };
  return withCors(req, success(body, 201));
}
