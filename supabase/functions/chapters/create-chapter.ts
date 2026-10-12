/**
 * Action: create-chapter
 *
 * Handler for POST /functions/v1/chapters/create-chapter. Grouping vs
 * autonomous drives currency + registration + contact via the RPC.
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
    parentBranchId: z.string().uuid(),
    chapterKind: z.enum(['autonomous', 'grouping']),
    name: z.string().min(1).max(200),
    slug: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case ASCII'),
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    region: z.string().min(1).max(120),
    city: z.string().min(1).max(120),
    currencyCode: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .nullish(),
    nickname: z.string().max(200).nullish(),
    description: z.string().max(2000).nullish(),
    registrationFeeRequired: z.boolean().default(false),
    registrationFeeAmount: z.number().nonnegative().nullish(),
    registrationFeeCurrency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .nullish(),
    contactEmail: z.string().email().nullish(),
    contactPhone: z.string().max(40).nullish(),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict()
  .refine((v) => v.chapterKind !== 'autonomous' || !!v.currencyCode, {
    message: 'autonomous chapters require currencyCode',
  });

interface SuccessBody {
  scopeId: string;
  traceId: string;
}

export async function createChapter(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  const { data: parent } = await supabase
    .schema('core' as never)
    .from('scopes')
    .select('id, scope_type')
    .eq('id', input.parentBranchId)
    .maybeSingle();
  if (!parent) return withCors(req, notFound('parent_branch', ctx.traceId));
  if ((parent as { scope_type: string }).scope_type !== 'branch') {
    return withCors(
      req,
      validationError('parentBranchId is not a branch', ctx.traceId, {
        parentBranchId: `expected branch, got ${(parent as { scope_type: string }).scope_type}`,
      }),
    );
  }

  const allowed = await authorize(supabase, ctx, {
    action: 'scope.create',
    scopeId: input.parentBranchId,
  });
  if (!allowed) {
    return withCors(req, forbidden('scope.create', ctx.traceId, { scopeId: input.parentBranchId }));
  }

  const { data: scopeId, error: rpcErr } = await supabase.schema('core' as never).rpc(
    'create_chapter' as never,
    {
      p_parent_branch_id: input.parentBranchId,
      p_chapter_kind: input.chapterKind,
      p_name: input.name,
      p_slug: input.slug,
      p_country_code: input.countryCode,
      p_region: input.region,
      p_city: input.city,
      p_currency_code: input.currencyCode ?? null,
      p_nickname: input.nickname ?? null,
      p_description: input.description ?? null,
      p_registration_fee_required: input.registrationFeeRequired,
      p_registration_fee_amount: input.registrationFeeAmount ?? null,
      p_registration_fee_currency: input.registrationFeeCurrency ?? null,
      p_contact_email: input.contactEmail ?? null,
      p_contact_phone: input.contactPhone ?? null,
      p_metadata: input.metadata,
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
        message: 'chapters/create-chapter: RPC failed',
        code: rpcErr.code,
        error: rpcErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const newScopeId = String(scopeId);

  await logEvent(supabase, ctx, {
    action: 'chapter.created',
    entitySchema: 'core',
    entityTable: 'scopes',
    entityId: newScopeId,
    scopeId: newScopeId,
    metadata: {
      name: input.name,
      chapterKind: input.chapterKind,
      parentBranchId: input.parentBranchId,
    },
  });

  const body: SuccessBody = { scopeId: newScopeId, traceId: ctx.traceId };
  return withCors(req, success(body, 201));
}
