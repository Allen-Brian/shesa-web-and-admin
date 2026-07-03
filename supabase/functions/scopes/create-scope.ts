/**
 * Edge Function: create-scope
 *
 * Creates a new scope (Branch / Chapter / Batch / House / Sector) under
 * a parent. The single authority for scope creation per ADR-0033 — apps,
 * scripts, and the create-network / create-next-year-batch wrappers all
 * funnel through this shape.
 *
 * Auth model:
 *   - Caller has `scope.create` at the parent scope (or a non-autonomous
 *     ancestor — has_permission walks the tree). For mainstream, only
 *     the seed script or a service-role script can create it; the
 *     `scopes_only_one_mainstream` unique index guarantees at most one.
 *   - INSERT runs under the caller's JWT so RLS is the second line.
 *
 * Idempotency:
 *   - Uniqueness on `slug`. A retried create with the same slug returns
 *     200 with the existing id (idempotent success), not 409.
 *   - Batch: uniqueness on `entry_year WHERE scope_type='batch'`. Same
 *     idempotent handling.
 *
 * Auditing:
 *   - Writes audit `scope.created` after a successful INSERT. Failed
 *     validations do NOT audit — that's noise, not signal.
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
import { loadParent, validateCreateShape } from '../_shared/scope-validation.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z
  .object({
    name: z.string().min(1).max(200),
    slug: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case ASCII'),
    scopeType: z.enum(['branch', 'chapter', 'batch', 'house', 'network']),
    parentScopeId: z.string().uuid(),
    chapterKind: z.enum(['autonomous', 'grouping']).nullish(),
    entryYear: z.number().int().nullish(),
    nickname: z.string().max(200).nullish(),
    country: z.string().max(80).nullish(),
    regionState: z.string().max(120).nullish(),
    city: z.string().max(120).nullish(),
    currencyCode: z.string().length(3).default('XAF'),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

interface SuccessBody {
  scopeId: string;
  alreadyExisted: boolean;
  traceId: string;
}

export async function createScope(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  // Load the parent so we can validate the shape and permission-check
  // at the parent's scope in the same round-trip. If the parent isn't
  // readable under the caller's RLS, we surface as validation — the
  // caller shouldn't distinguish "no such scope" from "you can't see it".
  const parent = await loadParent(supabase, input.parentScopeId);
  if (!parent) {
    return withCors(
      req,
      validationError('parentScopeId does not resolve to a readable scope', ctx.traceId, {
        parentScopeId: 'not found',
      }),
    );
  }

  const shape = validateCreateShape({
    scopeType: input.scopeType,
    parent,
    chapterKind: input.chapterKind,
    entryYear: input.entryYear,
  });
  if (!shape.ok) {
    return withCors(
      req,
      validationError(
        shape.message,
        ctx.traceId,
        shape.field ? { [shape.field]: shape.message } : undefined,
      ),
    );
  }

  const allowed = await authorize(supabase, ctx, {
    action: 'scope.create',
    scopeId: input.parentScopeId,
  });
  if (!allowed) {
    return withCors(req, forbidden('scope.create', ctx.traceId, { scopeId: input.parentScopeId }));
  }

  // ── INSERT ────────────────────────────────────────────────────────────
  const insertRow = {
    name: input.name,
    slug: input.slug,
    scope_type: input.scopeType,
    parent_scope_id: input.parentScopeId,
    chapter_kind: input.chapterKind ?? null,
    entry_year: input.entryYear ?? null,
    nickname: input.nickname ?? null,
    country: input.country ?? null,
    region_state: input.regionState ?? null,
    city: input.city ?? null,
    currency_code: input.currencyCode,
    metadata: input.metadata,
  };

  const { data: inserted, error: insertErr } = await supabase
    .schema('core' as never)
    .from('scopes' as never)
    .insert(insertRow as never)
    .select('id')
    .maybeSingle();

  if (insertErr) {
    // 23505 = unique_violation. slug collision OR batch entry_year collision.
    if (insertErr.code === '23505') {
      // Look up the existing row by whichever natural key matches.
      const existing = await supabase
        .schema('core' as never)
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
        conflict(
          'SCOPE_ALREADY_EXISTS',
          'A scope with this slug or entry_year already exists',
          ctx.traceId,
        ),
      );
    }
    if (insertErr.code === '42501') {
      // RLS rejected after policy allowed — genuine mismatch. Log + 500.
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'create-scope: RLS rejected after policy allowed (mismatch bug)',
          parentScopeId: input.parentScopeId,
          scopeType: input.scopeType,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'create-scope: INSERT failed',
        code: insertErr.code,
        error: insertErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const scopeId = (inserted as { id: string }).id;

  // Emit audit — the scopes table doesn't have a trigger like
  // role_assignments does, so the Edge Function is the writer.
  await logEvent(supabase, ctx, {
    action: 'scope.created',
    entitySchema: 'core',
    entityTable: 'scopes',
    entityId: scopeId,
    scopeId,
    metadata: { scope_type: input.scopeType, parent_scope_id: input.parentScopeId },
  });

  const body: SuccessBody = { scopeId, alreadyExisted: false, traceId: ctx.traceId };
  return withCors(req, success(body, 201));
}
