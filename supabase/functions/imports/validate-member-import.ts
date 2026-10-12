/**
 * Edge Function: validate-member-import
 *
 * Re-runs row validation on an existing batch — useful after the
 * operator edits `normalized_data` on individual rows via the review
 * UI, or after a seed change (a new network added) that promotes
 * previously-invalid rows to valid.
 *
 * Only touches rows currently in `pending` / `invalid` state — rows
 * already `valid` / `duplicate` / `skipped` / `created` are left
 * alone so a re-validate doesn't unhelpfully clobber operator
 * decisions.
 *
 * Batch counters are recomputed at the end so the review UI shows
 * consistent totals.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import { forbidden, internalError, notFound, success, unauthorized } from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';
import { loadSeedContext, validateImportRow } from '../_shared/import-validation.ts';

const inputSchema = z.object({ batchId: z.string().uuid() }).strict();

interface SuccessBody {
  batchId: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  reValidated: number;
  traceId: string;
}

export async function validateMemberImport(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const userClient = createUserClient(ctx.jwt);
  const service = createServiceRoleClient();

  const { data: batch } = await userClient
    .schema('core' as never)
    .from('import_batches' as never)
    .select('id, scope_id, status')
    .eq('id', input.batchId)
    .maybeSingle();

  if (!batch) return withCors(req, notFound('import_batch', ctx.traceId));
  const b = batch as { scope_id: string; status: string };

  if (b.status !== 'uploaded' && b.status !== 'validated') {
    return withCors(
      req,
      forbidden(`cannot re-validate a batch in status ${b.status}`, ctx.traceId, {
        status: b.status,
      }),
    );
  }

  const allowed = await authorize(userClient, ctx, {
    action: 'member.import',
    scopeId: b.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('member.import', ctx.traceId, { scopeId: b.scope_id }));
  }

  // ── Re-validate rows currently in pending / invalid state ────────
  const { data: rows } = await service
    .schema('core' as never)
    .from('import_rows' as never)
    .select('id, raw_data, normalized_data, validation_status')
    .eq('import_batch_id', input.batchId)
    .in('validation_status', ['pending', 'invalid']);

  const seed = await loadSeedContext(service as never);
  let reValidated = 0;

  for (const r of (rows as Array<{
    id: string;
    raw_data: Record<string, unknown>;
    normalized_data: Record<string, unknown>;
    validation_status: string;
  }>) ?? []) {
    const source = Object.keys(r.normalized_data ?? {}).length > 0 ? r.normalized_data : r.raw_data;
    const result = validateImportRow(source as never, seed, {
      targetBatchScopeId: b.scope_id,
    });
    await service
      .schema('core' as never)
      .from('import_rows' as never)
      .update({
        validation_status: result.status,
        errors: result.errors,
        normalized_data: result.normalized,
      } as never)
      .eq('id', r.id);
    reValidated++;
  }

  // Recompute counters. Cheap — a single group-by over row counts.
  const { data: countRows } = await service
    .schema('core' as never)
    .from('import_rows' as never)
    .select('validation_status')
    .eq('import_batch_id', input.batchId);

  const total = (countRows as Array<{ validation_status: string }> | null)?.length ?? 0;
  const valid = ((countRows as Array<{ validation_status: string }>) ?? []).filter(
    (r) => r.validation_status === 'valid',
  ).length;
  const invalid = total - valid;

  await service
    .schema('core' as never)
    .from('import_batches' as never)
    .update({
      total_rows: total,
      valid_rows: valid,
      invalid_rows: invalid,
      status: 'validated',
    } as never)
    .eq('id', input.batchId);

  await logEvent(userClient, ctx, {
    action: 'member.import_validated',
    entitySchema: 'core',
    entityTable: 'import_batches',
    entityId: input.batchId,
    scopeId: b.scope_id,
    metadata: { reValidated, total, valid, invalid },
  });

  const body: SuccessBody = {
    batchId: input.batchId,
    totalRows: total,
    validRows: valid,
    invalidRows: invalid,
    reValidated,
    traceId: ctx.traceId,
  };
  return withCors(req, success(body));
}
