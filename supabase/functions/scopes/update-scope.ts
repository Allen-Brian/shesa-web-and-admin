/**
 * Edge Function: update-scope
 *
 * Edits an existing scope's editable fields — name, nickname,
 * geography, currency (until finance exists), metadata, status.
 *
 * Does NOT flip chapter_kind — that's a distinct decision with its own
 * permission (`scope.change_autonomy`) and its own wrapper
 * (`set-chapter-autonomy`). Trying to send `chapterKind` here is
 * rejected as a 422 with a hint pointing at the right endpoint.
 *
 * Auth model:
 *   - Caller has `scope.update` at the target scope (or an ancestor
 *     up to the autonomous boundary).
 *   - RLS is the second line of defense on the UPDATE.
 *
 * Auditing: writes `scope.updated` with the diff in metadata (only the
 * fields that actually changed appear in the metadata `before/after`
 * shape — nothing noisy).
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
    scopeId: z.string().uuid(),
    name: z.string().min(1).max(200).optional(),
    nickname: z.string().max(200).nullable().optional(),
    country: z.string().max(80).nullable().optional(),
    regionState: z.string().max(120).nullable().optional(),
    city: z.string().max(120).nullable().optional(),
    currencyCode: z.string().length(3).optional(),
    metadata: z.record(z.unknown()).optional(),
    status: z.enum(['active', 'inactive', 'archived']).optional(),
  })
  .strict();

type UpdatePayload = Record<string, unknown>;

interface SuccessBody {
  scopeId: string;
  updated: string[];
  traceId: string;
}

export async function updateScope(req: Request): Promise<Response> {
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

  // Load the current row to diff against — the diff drives both the
  // audit metadata and the "which fields changed" response.
  const { data: current, error: currentErr } = await supabase
    .schema('core' as never)
    .from('scopes' as never)
    .select('id, name, nickname, country, region_state, city, currency_code, metadata, status')
    .eq('id', input.scopeId)
    .maybeSingle();

  if (currentErr || !current) {
    return withCors(req, notFound('scope', ctx.traceId));
  }
  const before = current as Record<string, unknown>;

  // Build a sparse UPDATE — only include fields the caller actually
  // sent. Sending `nickname: null` is a legitimate "clear" and hits
  // the update path; only *omitted* keys are skipped.
  const patch: UpdatePayload = {};
  const changed: string[] = [];
  const record = (key: keyof typeof input, column: string) => {
    if (input[key] === undefined) return;
    if (before[column] === input[key]) return;
    patch[column] = input[key];
    changed.push(column);
  };
  record('name', 'name');
  record('nickname', 'nickname');
  record('country', 'country');
  record('regionState', 'region_state');
  record('city', 'city');
  record('currencyCode', 'currency_code');
  record('metadata', 'metadata');
  record('status', 'status');

  if (changed.length === 0) {
    // No-op update — return success with an empty change list rather
    // than round-tripping to the DB.
    const body: SuccessBody = { scopeId: input.scopeId, updated: [], traceId: ctx.traceId };
    return withCors(req, success(body));
  }

  const { error: updateErr } = await supabase
    .schema('core' as never)
    .from('scopes' as never)
    .update(patch as never)
    .eq('id', input.scopeId);

  if (updateErr) {
    if (updateErr.code === '42501') {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'update-scope: RLS rejected after policy allowed (mismatch bug)',
          scopeId: input.scopeId,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
    if (updateErr.code === '23514') {
      // check_violation — most likely a CHECK constraint on the scopes
      // shape (chapter_kind on non-chapter row, etc.).
      return withCors(
        req,
        validationError('Update violates a scope invariant', ctx.traceId, {
          _: updateErr.message,
        }),
      );
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'update-scope: UPDATE failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const diff: Record<string, { before: unknown; after: unknown }> = {};
  for (const col of changed) {
    diff[col] = { before: before[col], after: patch[col] };
  }
  await logEvent(supabase, ctx, {
    action: 'scope.updated',
    entitySchema: 'core',
    entityTable: 'scopes',
    entityId: input.scopeId,
    scopeId: input.scopeId,
    metadata: { changed, diff },
  });

  const body: SuccessBody = { scopeId: input.scopeId, updated: changed, traceId: ctx.traceId };
  return withCors(req, success(body));
}
