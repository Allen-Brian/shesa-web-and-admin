/**
 * Action: update-batch
 *
 * Patches name / ordinal / nickname / description / contact + soft-archive
 * via `status`. Underlying transaction lives in `core.update_batch()`.
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
    ordinal: z.number().int().positive().nullable().optional(),
    nickname: z.string().max(80).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    contactEmail: z.string().email().nullable().optional(),
    contactPhone: z.string().max(40).nullable().optional(),
    status: z.enum(['active', 'inactive', 'archived']).optional(),
  })
  .strict();

interface SuccessBody {
  scopeId: string;
  updated: string[];
  traceId: string;
}

export async function updateBatch(req: Request): Promise<Response> {
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
  if (!current) return withCors(req, notFound('batch', ctx.traceId));
  if ((current as { scope_type: string }).scope_type !== 'batch') {
    return withCors(
      req,
      validationError('scope is not a batch', ctx.traceId, {
        scopeId: `expected batch, got ${(current as { scope_type: string }).scope_type}`,
      }),
    );
  }

  const { error: rpcErr } = await supabase.schema('core' as never).rpc(
    'update_batch' as never,
    {
      p_scope_id: input.scopeId,
      p_name: input.name ?? null,
      p_ordinal: input.ordinal ?? null,
      p_nickname: input.nickname ?? null,
      p_description: input.description ?? null,
      p_contact_email: input.contactEmail ?? null,
      p_contact_phone: input.contactPhone ?? null,
      p_status: input.status ?? null,
    } as never,
  );

  if (rpcErr) {
    if (rpcErr.code === '23505') {
      const detail = String(rpcErr.details ?? rpcErr.message ?? '');
      const isOrdinal = detail.toLowerCase().includes('ordinal');
      return withCors(
        req,
        conflict(
          isOrdinal ? 'ORDINAL_TAKEN' : 'SLUG_TAKEN',
          isOrdinal
            ? 'Another batch already claims that ordinal position.'
            : 'Another batch already uses that slug.',
          ctx.traceId,
        ),
      );
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'batches/update-batch: RPC failed',
        code: rpcErr.code,
        error: rpcErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const changed = Object.entries({
    name: input.name,
    ordinal: input.ordinal,
    nickname: input.nickname,
    description: input.description,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    status: input.status,
  })
    .filter(([, v]) => v !== undefined)
    .map(([k]) => k);

  await logEvent(supabase, ctx, {
    action: input.status === 'archived' ? 'batch.archived' : 'batch.updated',
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
