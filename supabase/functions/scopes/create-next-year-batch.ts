/**
 * Edge Function: create-next-year-batch
 *
 * Idempotent creator for the batch row that names next year's cohort.
 * Takes no input — inspects the current UTC year and creates the
 * `(current + 1)` batch under Mainstream. Retries collapse to a 200
 * with `alreadyExists: true` because the `scopes_batch_entry_year_unique`
 * partial index gives natural dedup.
 *
 * Meant to be pg_cron-triggered in Phase 2 (e.g. daily; the first day
 * of the new year picks up the row, every subsequent day is a no-op).
 * Also callable from the Exco UI as a "seed next year" manual button
 * for setup on-boarding.
 *
 * Auth: same `scope.create` at Mainstream that create-scope requires.
 * When invoked from pg_cron the call carries the service-role JWT which
 * bypasses the self-guard on has_permission; when invoked from the UI
 * the calling admin's permissions apply.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import { forbidden, internalError, notFound, success, unauthorized } from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

// Accept an optional `targetYear` for testability + backfill; default
// is next year based on the runtime clock.
const inputSchema = z.object({ targetYear: z.number().int().optional() }).strict();

interface SuccessBody {
  scopeId: string;
  entryYear: number;
  alreadyExisted: boolean;
  traceId: string;
}

export async function createNextYearBatch(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const nowYear = new Date().getUTCFullYear();
  const targetYear = input.targetYear ?? nowYear + 1;

  const supabase = createUserClient(ctx.jwt);

  const { data: mainstream } = await supabase
    .schema('core' as never)
    .from('scopes' as never)
    .select('id')
    .eq('scope_type', 'mainstream')
    .maybeSingle();

  if (!mainstream) return withCors(req, notFound('mainstream_scope', ctx.traceId));
  const mainstreamId = (mainstream as { id: string }).id;

  // Idempotent: check first, then INSERT ON CONFLICT.
  const { data: existing } = await supabase
    .schema('core' as never)
    .from('scopes' as never)
    .select('id')
    .eq('scope_type', 'batch')
    .eq('entry_year', targetYear)
    .maybeSingle();

  if (existing) {
    const body: SuccessBody = {
      scopeId: (existing as { id: string }).id,
      entryYear: targetYear,
      alreadyExisted: true,
      traceId: ctx.traceId,
    };
    return withCors(req, success(body));
  }

  const allowed = await authorize(supabase, ctx, {
    action: 'scope.create',
    scopeId: mainstreamId,
  });
  if (!allowed) {
    return withCors(req, forbidden('scope.create', ctx.traceId, { scopeId: mainstreamId }));
  }

  const { data: inserted, error: insertErr } = await supabase
    .schema('core' as never)
    .from('scopes' as never)
    .insert({
      name: `Batch ${targetYear}`,
      slug: `batch-${targetYear}`,
      scope_type: 'batch',
      parent_scope_id: mainstreamId,
      entry_year: targetYear,
      currency_code: 'XAF',
    } as never)
    .select('id')
    .maybeSingle();

  if (insertErr) {
    if (insertErr.code === '23505') {
      // Race: another caller (or a re-run of pg_cron) beat us to it.
      // Re-lookup and return existing.
      const { data: raceExisting } = await supabase
        .schema('core' as never)
        .from('scopes' as never)
        .select('id')
        .eq('entry_year', targetYear)
        .maybeSingle();
      if (raceExisting) {
        const body: SuccessBody = {
          scopeId: (raceExisting as { id: string }).id,
          entryYear: targetYear,
          alreadyExisted: true,
          traceId: ctx.traceId,
        };
        return withCors(req, success(body));
      }
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'create-next-year-batch: INSERT failed',
        code: insertErr.code,
        error: insertErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const scopeId = (inserted as { id: string }).id;
  await logEvent(supabase, ctx, {
    action: 'batch.created',
    entitySchema: 'core',
    entityTable: 'scopes',
    entityId: scopeId,
    scopeId,
    metadata: { entry_year: targetYear, source: 'create-next-year-batch' },
  });

  const body: SuccessBody = {
    scopeId,
    entryYear: targetYear,
    alreadyExisted: false,
    traceId: ctx.traceId,
  };
  return withCors(req, success(body, 201));
}
