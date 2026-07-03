/**
 * Action: update-chapter
 *
 * Handler for POST /functions/v1/chapters/update-chapter. This does
 * NOT change `chapter_kind` — that's a distinct action guarded by
 * `scope.change_autonomy` and lives in `set-chapter-autonomy.ts`.
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
    countryCode: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .optional(),
    region: z.string().min(1).max(120).optional(),
    city: z.string().min(1).max(120).optional(),
    currencyCode: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    nickname: z.string().max(200).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    registrationFeeRequired: z.boolean().optional(),
    registrationFeeAmount: z.number().nonnegative().nullable().optional(),
    registrationFeeCurrency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .nullable()
      .optional(),
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

export async function updateChapter(req: Request): Promise<Response> {
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
  if (!current) return withCors(req, notFound('chapter', ctx.traceId));
  if ((current as { scope_type: string }).scope_type !== 'chapter') {
    return withCors(
      req,
      validationError('scope is not a chapter', ctx.traceId, {
        scopeId: `expected chapter, got ${(current as { scope_type: string }).scope_type}`,
      }),
    );
  }

  const { error: rpcErr } = await supabase.schema('core' as never).rpc(
    'update_chapter' as never,
    {
      p_scope_id: input.scopeId,
      p_name: input.name ?? null,
      p_country_code: input.countryCode ?? null,
      p_region: input.region ?? null,
      p_city: input.city ?? null,
      p_currency_code: input.currencyCode ?? null,
      p_nickname: input.nickname ?? null,
      p_description: input.description ?? null,
      p_registration_fee_required: input.registrationFeeRequired ?? null,
      p_registration_fee_amount: input.registrationFeeAmount ?? null,
      p_registration_fee_currency: input.registrationFeeCurrency ?? null,
      p_contact_email: input.contactEmail ?? null,
      p_contact_phone: input.contactPhone ?? null,
      p_status: input.status ?? null,
    } as never,
  );

  if (rpcErr) {
    if (rpcErr.code === '23505') {
      return withCors(
        req,
        conflict('SLUG_TAKEN', 'Another chapter already uses that slug.', ctx.traceId),
      );
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'chapters/update-chapter: RPC failed',
        code: rpcErr.code,
        error: rpcErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const changed = Object.entries(input)
    .filter(([k, v]) => k !== 'scopeId' && v !== undefined)
    .map(([k]) => k);

  await logEvent(supabase, ctx, {
    action: input.status === 'archived' ? 'chapter.archived' : 'chapter.updated',
    entitySchema: 'core',
    entityTable: 'scopes',
    entityId: input.scopeId,
    scopeId: input.scopeId,
    metadata: { changed },
  });

  const body: SuccessBody = { scopeId: input.scopeId, updated: changed, traceId: ctx.traceId };
  return withCors(req, success(body));
}
