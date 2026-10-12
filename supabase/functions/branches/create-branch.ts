/**
 * Action: create-branch
 *
 * Handler for POST /functions/v1/branches/create-branch. Atomic scopes
 * + branches insert via `core.create_branch()` (SECURITY DEFINER).
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
    countryCode: z.string().regex(/^[A-Z]{2}$/, 'countryCode must be ISO 3166-1 alpha-2'),
    region: z.string().min(1).max(120),
    city: z.string().min(1).max(120),
    currencyCode: z.string().regex(/^[A-Z]{3}$/, 'currencyCode must be ISO 4217'),
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
  .refine((v) => v.registrationFeeRequired === false || v.registrationFeeAmount != null, {
    message: 'registrationFeeAmount required when registrationFeeRequired = true',
  });

interface SuccessBody {
  scopeId: string;
  traceId: string;
}

export async function createBranch(req: Request): Promise<Response> {
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
    'create_branch' as never,
    {
      p_name: input.name,
      p_slug: input.slug,
      p_country_code: input.countryCode,
      p_region: input.region,
      p_city: input.city,
      p_currency_code: input.currencyCode,
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
        conflict('SLUG_TAKEN', 'Another branch already uses that slug.', ctx.traceId),
      );
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'branches/create-branch: RPC failed',
        code: rpcErr.code,
        error: rpcErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const newScopeId = String(scopeId);

  await logEvent(supabase, ctx, {
    action: 'branch.created',
    entitySchema: 'core',
    entityTable: 'scopes',
    entityId: newScopeId,
    scopeId: newScopeId,
    metadata: { name: input.name, countryCode: input.countryCode },
  });

  const body: SuccessBody = { scopeId: newScopeId, traceId: ctx.traceId };
  return withCors(req, success(body, 201));
}
