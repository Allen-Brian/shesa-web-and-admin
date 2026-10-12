/**
 * Action: create-batch
 *
 * Handler for POST /functions/v1/batches/create-batch. Grouped under the
 * `batches/` entity folder; dispatched by `batches/index.ts` via
 * `entityRouter`. The atomic scopes + batches write lives in
 * `core.create_batch()` (SECURITY DEFINER). This handler owns auth +
 * input validation + the audit envelope.
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

const CURRENT_YEAR = new Date().getUTCFullYear();

const inputSchema = z
  .object({
    name: z.string().min(1).max(200),
    slug: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case ASCII'),
    entryYear: z
      .number()
      .int()
      .min(1900)
      .max(CURRENT_YEAR + 5),
    ordinal: z.number().int().positive().nullish(),
    nickname: z.string().max(80).nullish(),
    description: z.string().max(2000).nullish(),
    contactEmail: z.string().email().nullish(),
    contactPhone: z.string().max(40).nullish(),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

interface SuccessBody {
  scopeId: string;
  traceId: string;
}

export async function createBatch(req: Request): Promise<Response> {
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
    'create_batch' as never,
    {
      p_name: input.name,
      p_slug: input.slug,
      p_entry_year: input.entryYear,
      p_ordinal: input.ordinal ?? null,
      p_nickname: input.nickname ?? null,
      p_description: input.description ?? null,
      p_contact_email: input.contactEmail ?? null,
      p_contact_phone: input.contactPhone ?? null,
      p_metadata: input.metadata,
    } as never,
  );

  if (rpcErr) {
    if (rpcErr.code === '23505') {
      const detail = String(rpcErr.details ?? rpcErr.message ?? '');
      const lower = detail.toLowerCase();
      const isOrdinal = lower.includes('ordinal');
      const isYear = lower.includes('entry_year');
      return withCors(
        req,
        conflict(
          isOrdinal ? 'ORDINAL_TAKEN' : isYear ? 'ENTRY_YEAR_TAKEN' : 'SLUG_TAKEN',
          isOrdinal
            ? 'Another batch already claims that ordinal position.'
            : isYear
              ? 'A batch for that entry year already exists.'
              : 'Another batch already uses that slug.',
          ctx.traceId,
        ),
      );
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'batches/create-batch: RPC failed',
        code: rpcErr.code,
        error: rpcErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const newScopeId = String(scopeId);

  await logEvent(supabase, ctx, {
    action: 'batch.created',
    entitySchema: 'core',
    entityTable: 'scopes',
    entityId: newScopeId,
    scopeId: newScopeId,
    metadata: { name: input.name, entryYear: input.entryYear, ordinal: input.ordinal ?? null },
  });

  const body: SuccessBody = { scopeId: newScopeId, traceId: ctx.traceId };
  return withCors(req, success(body, 201));
}
