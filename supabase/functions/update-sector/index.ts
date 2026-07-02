/**
 * Edge Function: update-sector
 *
 * Thin wrapper around update-scope for sector edits. Same permission
 * (`scope.update`), same envelope shape. Distinct endpoint mostly for
 * discoverability + a targeted audit action key (`sector.updated` vs
 * the generic `scope.updated`) so operators reading the audit log can
 * spot sector changes without a scope_type join.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { handlePreflight, withCors } from '../_shared/cors.ts';
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
    scopeId: z.string().uuid(),
    name: z.string().min(1).max(200).optional(),
    metadata: z.record(z.unknown()).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

interface SuccessBody {
  scopeId: string;
  updated: string[];
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

  const allowed = await authorize(supabase, ctx, {
    action: 'scope.update',
    scopeId: input.scopeId,
  });
  if (!allowed) {
    return withCors(req, forbidden('scope.update', ctx.traceId, { scopeId: input.scopeId }));
  }

  const { data: current } = await supabase
    .from('scopes' as never)
    .select('id, scope_type, name, metadata, is_active')
    .eq('id', input.scopeId)
    .maybeSingle();

  if (!current) return withCors(req, notFound('sector', ctx.traceId));
  const row = current as {
    scope_type: string;
    name: string;
    metadata: unknown;
    is_active: boolean;
  };

  if (row.scope_type !== 'sector') {
    return withCors(
      req,
      validationError('scope is not a sector', ctx.traceId, {
        scopeId: `expected sector, got ${row.scope_type}`,
      }),
    );
  }

  const patch: Record<string, unknown> = {};
  const changed: string[] = [];
  if (input.name !== undefined && input.name !== row.name) {
    patch.name = input.name;
    changed.push('name');
  }
  if (input.metadata !== undefined) {
    patch.metadata = input.metadata;
    changed.push('metadata');
  }
  if (input.isActive !== undefined && input.isActive !== row.is_active) {
    patch.is_active = input.isActive;
    changed.push('is_active');
  }

  if (changed.length === 0) {
    const body: SuccessBody = { scopeId: input.scopeId, updated: [], traceId: ctx.traceId };
    return withCors(req, success(body));
  }

  const { error: updateErr } = await supabase
    .from('scopes' as never)
    .update(patch as never)
    .eq('id', input.scopeId);

  if (updateErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'update-sector: UPDATE failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(supabase, ctx, {
    action: 'sector.updated',
    entitySchema: 'core',
    entityTable: 'scopes',
    entityId: input.scopeId,
    scopeId: input.scopeId,
    metadata: { changed },
  });

  const body: SuccessBody = { scopeId: input.scopeId, updated: changed, traceId: ctx.traceId };
  return withCors(req, success(body));
});
