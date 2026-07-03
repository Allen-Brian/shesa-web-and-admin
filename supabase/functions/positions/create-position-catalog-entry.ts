/**
 * Edge Function: create-position-catalog-entry
 *
 * Mainstream Admin creates a new catalog row. `scope.manage_capabilities`
 * at Mainstream (per RLS in rls_positions).
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import {
  conflict,
  forbidden,
  internalError,
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
    scopeType: z.enum(['mainstream', 'branch', 'chapter', 'batch']),
    name: z.string().min(1).max(200),
    description: z.string().max(500).nullish(),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .strict();

export async function createPositionCatalogEntry(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  const { data: ms } = await supabase
    .schema('core' as never)
    .from('scopes' as never)
    .select('id')
    .eq('scope_type', 'mainstream')
    .maybeSingle();
  if (!ms) return withCors(req, internalError(ctx.traceId));
  const mainstreamId = (ms as { id: string }).id;

  const allowed = await authorize(supabase, ctx, {
    action: 'scope.manage_capabilities',
    scopeId: mainstreamId,
  });
  if (!allowed) {
    return withCors(
      req,
      forbidden('scope.manage_capabilities', ctx.traceId, { scopeId: mainstreamId }),
    );
  }

  const { data: inserted, error: insertErr } = await supabase
    .schema('core' as never)
    .from('position_catalog' as never)
    .insert({
      scope_type: input.scopeType,
      name: input.name,
      description: input.description ?? null,
      sort_order: input.sortOrder ?? 0,
    } as never)
    .select('id')
    .maybeSingle();

  if (insertErr) {
    if (insertErr.code === '23505') {
      return withCors(
        req,
        conflict(
          'POSITION_CATALOG_EXISTS',
          `A ${input.scopeType} position named "${input.name}" already exists`,
          ctx.traceId,
        ),
      );
    }
    if (insertErr.code === '23514') {
      return withCors(
        req,
        validationError('Catalog row violates a schema invariant', ctx.traceId, {
          _: insertErr.message,
        }),
      );
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'create-position-catalog-entry: INSERT failed',
        code: insertErr.code,
        error: insertErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const catalogId = (inserted as { id: string }).id;

  await logEvent(supabase, ctx, {
    action: 'position.catalog.created',
    entitySchema: 'core',
    entityTable: 'position_catalog',
    entityId: catalogId,
    scopeId: mainstreamId,
    metadata: { scopeType: input.scopeType, name: input.name },
  });

  return withCors(req, success({ catalogId, traceId: ctx.traceId }, 201));
}
