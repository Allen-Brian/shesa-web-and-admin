/**
 * Edge Function: create-sector
 *
 * Convenience wrapper that creates a sector under Mainstream. Phase 1
 * §2.4 restricts sector creation to the Mainstream Admin; the parent
 * scope is looked up server-side rather than accepted from the caller
 * so no request can drift.
 *
 * The heavy lifting — validation, permission check, INSERT, audit —
 * matches create-scope. Duplicating the logic (rather than importing
 * from create-scope) keeps each function self-contained per the Deno
 * Edge Function model.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { handlePreflight, withCors } from '../_shared/cors.ts';
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
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

interface SuccessBody {
  scopeId: string;
  alreadyExisted: boolean;
  traceId: string;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  // Locate the Mainstream scope. If seed hasn't run there's nothing we
  // can do here — surface as a clear 404.
  const { data: mainstream } = await supabase
    .from('scopes' as never)
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

  const { data: inserted, error: insertErr } = await supabase
    .from('scopes' as never)
    .insert({
      name: input.name,
      slug: input.slug,
      scope_type: 'sector',
      parent_scope_id: mainstreamId,
      currency_code: 'XAF',
      metadata: input.metadata,
      is_autonomous: false,
    } as never)
    .select('id')
    .maybeSingle();

  if (insertErr) {
    if (insertErr.code === '23505') {
      const existing = await supabase
        .from('scopes' as never)
        .select('id')
        .eq('slug', input.slug)
        .maybeSingle();
      if (existing.data) {
        const body: SuccessBody = {
          scopeId: (existing.data as { id: string }).id,
          alreadyExisted: true,
          traceId: ctx.traceId,
        };
        return withCors(req, success(body));
      }
      return withCors(
        req,
        conflict('SECTOR_ALREADY_EXISTS', 'A sector with this slug already exists', ctx.traceId),
      );
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'create-sector: INSERT failed',
        code: insertErr.code,
        error: insertErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const scopeId = (inserted as { id: string }).id;

  await logEvent(supabase, ctx, {
    action: 'sector.created',
    entitySchema: 'core',
    entityTable: 'scopes',
    entityId: scopeId,
    scopeId,
    metadata: { name: input.name },
  });

  const body: SuccessBody = { scopeId, alreadyExisted: false, traceId: ctx.traceId };
  return withCors(req, success(body, 201));
});
