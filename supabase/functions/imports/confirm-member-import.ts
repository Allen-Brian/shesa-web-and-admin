/**
 * Edge Function: confirm-member-import
 *
 * Commits every `valid` row in the batch as a real `core.members`
 * record. Idempotent: the batch transition `validated → confirmed`
 * is guarded by `WHERE status = 'validated'`, so a concurrent
 * re-confirm sees 0 rows affected, creates 0 members, and short-
 * circuits to the previous outcome.
 *
 * Duplicate detection is skipped here — the review step is where the
 * operator has already accepted the duplicate signals (or edited the
 * rows to clear them). Rows flagged as duplicates during review can
 * be left as `duplicate` (skipped) or promoted to `valid` in the UI
 * before confirm.
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
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z.object({ batchId: z.string().uuid() }).strict();

interface SuccessBody {
  batchId: string;
  createdRows: number;
  skippedRows: number;
  alreadyConfirmed: boolean;
  traceId: string;
}

export async function confirmMemberImport(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const userClient = createUserClient(ctx.jwt);

  const { data: batch } = await userClient
    .schema('core' as never)
    .from('import_batches' as never)
    .select('id, scope_id, status, created_rows')
    .eq('id', input.batchId)
    .maybeSingle();

  if (!batch) return withCors(req, notFound('import_batch', ctx.traceId));
  const b = batch as { scope_id: string; status: string; created_rows: number };

  // Idempotent short-circuit: already confirmed.
  if (b.status === 'confirmed') {
    const body: SuccessBody = {
      batchId: input.batchId,
      createdRows: b.created_rows,
      skippedRows: 0,
      alreadyConfirmed: true,
      traceId: ctx.traceId,
    };
    return withCors(req, success(body));
  }

  if (b.status !== 'validated') {
    return withCors(
      req,
      conflict('IMPORT_NOT_VALIDATED', `cannot confirm a batch in status ${b.status}`, ctx.traceId),
    );
  }

  const allowed = await authorize(userClient, ctx, {
    action: 'member.import',
    scopeId: b.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('member.import', ctx.traceId, { scopeId: b.scope_id }));
  }

  const service = createServiceRoleClient();

  // ── Reserve the transition atomically ────────────────────────────
  // The WHERE status='validated' guard makes a concurrent confirm a no-op
  // rather than a double-create.
  const { data: reserved, error: reserveErr } = await service
    .schema('core' as never)
    .from('import_batches' as never)
    .update({ status: 'uploaded' /* temporary hold */ } as never)
    .eq('id', input.batchId)
    .eq('status', 'validated')
    .select('id')
    .maybeSingle();

  if (reserveErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'confirm-member-import: transition reserve failed',
        error: reserveErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!reserved) {
    // Another caller won the race and is currently confirming (or
    // already did). Re-read the batch and return whatever the state
    // is now.
    const { data: after } = await service
      .schema('core' as never)
      .from('import_batches' as never)
      .select('status, created_rows')
      .eq('id', input.batchId)
      .maybeSingle();
    const a = after as { status: string; created_rows: number } | null;
    if (a?.status === 'confirmed') {
      const body: SuccessBody = {
        batchId: input.batchId,
        createdRows: a.created_rows,
        skippedRows: 0,
        alreadyConfirmed: true,
        traceId: ctx.traceId,
      };
      return withCors(req, success(body));
    }
    return withCors(
      req,
      conflict('IMPORT_RACE', 'concurrent confirm in progress; retry momentarily', ctx.traceId),
    );
  }

  // ── Fetch valid rows ─────────────────────────────────────────────
  const { data: rowsToCreate } = await service
    .schema('core' as never)
    .from('import_rows' as never)
    .select('id, row_number, normalized_data')
    .eq('import_batch_id', input.batchId)
    .eq('validation_status', 'valid');

  const valid =
    (rowsToCreate as Array<{
      id: string;
      row_number: number;
      normalized_data: Record<string, unknown>;
    }>) ?? [];

  let created = 0;
  const skipped: number[] = [];

  for (const row of valid) {
    const n = row.normalized_data;
    const insertShape = {
      full_name: n.full_name,
      display_name: n.display_name ?? null,
      email: n.email ?? null,
      phone: n.phone ?? null,
      batch_scope_id: n.batch_scope_id,
      house_scope_id: n.house_scope_id,
      network_scope_id: n.network_scope_id,
      field: n.field ?? null,
      entry_year: n.entry_year ?? null,
      exit_year: n.exit_year ?? null,
      current_country: n.current_country ?? null,
      current_region_state: n.current_region_state ?? null,
      current_city: n.current_city ?? null,
      created_by: ctx.userId,
    };
    const { data: mrow, error: mrowErr } = await service
      .schema('core' as never)
      .from('members' as never)
      .insert(insertShape as never)
      .select('id')
      .maybeSingle();

    if (mrowErr || !mrow) {
      // Skip this row on failure — a single bad row shouldn't roll back
      // the whole batch. Update the row with the DB error so the operator
      // can fix + re-validate + retry.
      skipped.push(row.row_number);
      await service
        .schema('core' as never)
        .from('import_rows' as never)
        .update({
          validation_status: 'invalid',
          errors: [mrowErr?.message ?? 'insert failed'],
        } as never)
        .eq('id', row.id);
      continue;
    }

    const memberId = (mrow as { id: string }).id;
    await service
      .schema('core' as never)
      .from('import_rows' as never)
      .update({ validation_status: 'created', created_member_id: memberId } as never)
      .eq('id', row.id);
    created++;
  }

  // ── Finalize batch status ────────────────────────────────────────
  await service
    .schema('core' as never)
    .from('import_batches' as never)
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      confirmed_by: ctx.userId,
      created_rows: created,
    } as never)
    .eq('id', input.batchId);

  await logEvent(userClient, ctx, {
    action: 'member.import_confirmed',
    entitySchema: 'core',
    entityTable: 'import_batches',
    entityId: input.batchId,
    scopeId: b.scope_id,
    metadata: { created, skipped: skipped.length, skippedRowNumbers: skipped },
  });

  const body: SuccessBody = {
    batchId: input.batchId,
    createdRows: created,
    skippedRows: skipped.length,
    alreadyConfirmed: false,
    traceId: ctx.traceId,
  };
  return withCors(req, success(body));
}
