/**
 * Edge Function: update-position-catalog-entry
 *
 * Mainstream Admin edits an existing catalog row (rename, resort,
 * activate/deactivate, edit description).
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import {
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
    catalogId: z.string().uuid(),
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(500).nullable().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export async function updatePositionCatalogEntry(req: Request): Promise<Response> {
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

  const patch: Record<string, unknown> = {};
  const changed: string[] = [];
  if (input.name !== undefined) {
    patch.name = input.name;
    changed.push('name');
  }
  if (input.description !== undefined) {
    patch.description = input.description;
    changed.push('description');
  }
  if (input.sortOrder !== undefined) {
    patch.sort_order = input.sortOrder;
    changed.push('sort_order');
  }
  if (input.isActive !== undefined) {
    patch.is_active = input.isActive;
    changed.push('is_active');
  }

  if (changed.length === 0) {
    return withCors(
      req,
      success({ catalogId: input.catalogId, updated: [], traceId: ctx.traceId }),
    );
  }

  const { data: existing } = await supabase
    .schema('core' as never)
    .from('position_catalog' as never)
    .select('id')
    .eq('id', input.catalogId)
    .maybeSingle();
  if (!existing) return withCors(req, notFound('position_catalog', ctx.traceId));

  const { error } = await supabase
    .schema('core' as never)
    .from('position_catalog' as never)
    .update(patch as never)
    .eq('id', input.catalogId);

  if (error) {
    if (error.code === '23505') {
      return withCors(
        req,
        validationError(
          'Catalog rename collides with an existing name for the same scope_type',
          ctx.traceId,
          {
            name: error.message,
          },
        ),
      );
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'update-position-catalog-entry: UPDATE failed',
        code: error.code,
        error: error.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(supabase, ctx, {
    action: 'position.catalog.updated',
    entitySchema: 'core',
    entityTable: 'position_catalog',
    entityId: input.catalogId,
    scopeId: mainstreamId,
    metadata: { changed },
  });

  return withCors(
    req,
    success({ catalogId: input.catalogId, updated: changed, traceId: ctx.traceId }),
  );
}
