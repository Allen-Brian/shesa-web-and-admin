/**
 * Action: update-network
 *
 * Handler for POST /functions/v1/networks/update-network. Patches name +
 * short_name/description/icon/color_hex/sort_order, plus `status` for
 * soft-archive. Underlying transaction lives in `core.update_network()`.
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
  validationError,
} from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z
  .object({
    scopeId: z.string().uuid(),
    name: z.string().min(1).max(200).optional(),
    shortName: z.string().min(1).max(40).optional(),
    description: z.string().max(2000).nullable().optional(),
    icon: z.string().max(80).nullable().optional(),
    colorHex: z
      .string()
      .regex(
        /^#[0-9a-f]{3}([0-9a-f]{3}([0-9a-f]{2})?)?$/i,
        'colorHex must be a #RGB / #RRGGBB / #RRGGBBAA value',
      )
      .nullable()
      .optional(),
    sortOrder: z.number().int().min(0).max(999).optional(),
    status: z.enum(['active', 'inactive', 'archived']).optional(),
  })
  .strict();

interface SuccessBody {
  scopeId: string;
  updated: string[];
  traceId: string;
}

export async function updateNetwork(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  const allowed = await authorize(supabase, ctx, {
    action: 'scope.update',
    scopeId: input.scopeId,
  });
  if (!allowed) {
    return withCors(req, forbidden('scope.update', ctx.traceId, { scopeId: input.scopeId }));
  }

  const { data: current } = await supabase
    .schema('core' as never)
    .from('scopes')
    .select('id, scope_type')
    .eq('id', input.scopeId)
    .maybeSingle();
  if (!current) return withCors(req, notFound('network', ctx.traceId));
  if ((current as { scope_type: string }).scope_type !== 'network') {
    return withCors(
      req,
      validationError('scope is not a network', ctx.traceId, {
        scopeId: `expected network, got ${(current as { scope_type: string }).scope_type}`,
      }),
    );
  }

  const { error: rpcErr } = await supabase.schema('core' as never).rpc(
    'update_network' as never,
    {
      p_scope_id: input.scopeId,
      p_name: input.name ?? null,
      p_short_name: input.shortName ?? null,
      p_description: input.description ?? null,
      p_icon: input.icon ?? null,
      p_color_hex: input.colorHex ?? null,
      p_sort_order: input.sortOrder ?? null,
      p_status: input.status ?? null,
    } as never,
  );

  if (rpcErr) {
    if (rpcErr.code === '23514' && String(rpcErr.message).includes('cannot archive')) {
      return withCors(req, conflict('NETWORK_HAS_MEMBERS', rpcErr.message, ctx.traceId));
    }
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
        message: 'networks/update-network: RPC failed',
        code: rpcErr.code,
        error: rpcErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const changed = Object.entries({
    name: input.name,
    shortName: input.shortName,
    description: input.description,
    icon: input.icon,
    colorHex: input.colorHex,
    sortOrder: input.sortOrder,
    status: input.status,
  })
    .filter(([, v]) => v !== undefined)
    .map(([k]) => k);

  await logEvent(supabase, ctx, {
    action: input.status === 'archived' ? 'network.archived' : 'network.updated',
    entitySchema: 'core',
    entityTable: 'scopes',
    entityId: input.scopeId,
    scopeId: input.scopeId,
    metadata: { changed },
  });

  const body: SuccessBody = {
    scopeId: input.scopeId,
    updated: changed,
    traceId: ctx.traceId,
  };
  return withCors(req, success(body));
}
