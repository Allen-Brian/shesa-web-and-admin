/**
 * Edge Function: upload-member-import
 *
 * The entry point for Excel member imports (Phase 1 §7.2). Flow:
 *
 *   1. SPA uploads the raw .xlsx to the private `member-imports` bucket
 *      under its own path (the Storage INSERT policy gates this on
 *      `member.import`).
 *   2. SPA calls THIS function with `{ scopeId, fileName, storagePath }`.
 *   3. Function reads the object via service-role (Storage RLS doesn't
 *      grant read to authenticated), parses via SheetJS, writes an
 *      `import_batches` row + N `import_rows` rows, runs the row
 *      validator, and returns the batch id + summary.
 *
 * Server-side parse is a deliberate choice — see ADR-0033 + the Phase 1
 * plan's E1.3 "server-side in an Edge Function" decision. The client
 * never gets to send a hand-crafted normalized shape that skips
 * validation.
 *
 * Idempotency: this call is not idempotent — a re-upload creates a
 * new batch. The next-step calls (`validate-member-import` re-parse,
 * `confirm-member-import` commit) are idempotent per E1.3.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import {
  forbidden,
  internalError,
  success,
  unauthorized,
  validationError,
} from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';
import { parseXlsxToRows } from '../_shared/xlsx-parse.ts';
import {
  loadSeedContext,
  validateImportRow,
  type ValidateRowResult,
} from '../_shared/import-validation.ts';

const MEMBER_IMPORTS_BUCKET = 'member-imports';

const inputSchema = z
  .object({
    scopeId: z.string().uuid(),
    fileName: z.string().min(1).max(500),
    storagePath: z.string().min(1).max(500),
  })
  .strict();

interface SuccessBody {
  batchId: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  traceId: string;
}

export async function uploadMemberImport(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const userClient = createUserClient(ctx.jwt);

  const allowed = await authorize(userClient, ctx, {
    action: 'member.import',
    scopeId: input.scopeId,
  });
  if (!allowed) {
    return withCors(req, forbidden('member.import', ctx.traceId, { scopeId: input.scopeId }));
  }

  // Read the object via service-role — Storage RLS doesn't grant SELECT
  // to authenticated for the private member-imports bucket.
  const service = createServiceRoleClient();
  const { data: fileBlob, error: dlErr } = await service.storage
    .from(MEMBER_IMPORTS_BUCKET)
    .download(input.storagePath);

  if (dlErr || !fileBlob) {
    return withCors(
      req,
      validationError('Uploaded file not found in storage', ctx.traceId, {
        storagePath: dlErr?.message ?? 'download failed',
      }),
    );
  }

  const bytes = new Uint8Array(await fileBlob.arrayBuffer());

  // ── Parse ─────────────────────────────────────────────────────────
  let rows;
  try {
    rows = parseXlsxToRows(bytes);
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'upload-member-import: xlsx parse failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    // Create a failed batch row so the operator can see the error, then bail.
    await service
      .schema('core' as never)
      .from('import_batches' as never)
      .insert({
        scope_id: input.scopeId,
        uploaded_by: ctx.userId,
        file_name: input.fileName,
        storage_path: input.storagePath,
        status: 'failed',
        parse_error: err instanceof Error ? err.message : 'unknown parse error',
      } as never);
    return withCors(
      req,
      validationError('Could not parse the uploaded .xlsx', ctx.traceId, {
        _: err instanceof Error ? err.message : 'unknown parse error',
      }),
    );
  }

  // ── Validate every row against the seed catalog ───────────────────
  const seed = await loadSeedContext(service as never);
  // The scope the operator is uploading into IS the batch — pin every
  // row to it so operators don't have to fill batch_entry_year.
  const results: ValidateRowResult[] = rows.map((r) =>
    validateImportRow(r, seed, { targetBatchScopeId: input.scopeId }),
  );

  const validCount = results.filter((r) => r.status === 'valid').length;
  const invalidCount = results.length - validCount;

  // ── Persist batch + rows ──────────────────────────────────────────
  const { data: batchRow, error: batchErr } = await service
    .schema('core' as never)
    .from('import_batches' as never)
    .insert({
      scope_id: input.scopeId,
      uploaded_by: ctx.userId,
      file_name: input.fileName,
      storage_path: input.storagePath,
      status: 'validated',
      total_rows: rows.length,
      valid_rows: validCount,
      invalid_rows: invalidCount,
    } as never)
    .select('id')
    .maybeSingle();

  if (batchErr || !batchRow) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'upload-member-import: batch INSERT failed',
        error: batchErr?.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  const batchId = (batchRow as { id: string }).id;

  // Bulk-insert rows. Postgres arrays of jsonb are fine here — we're
  // well within the row-count that a single INSERT can carry.
  const rowInserts = rows.map((raw, i) => ({
    import_batch_id: batchId,
    row_number: i + 1,
    raw_data: raw as Record<string, unknown>,
    normalized_data: results[i]?.normalized ?? {},
    validation_status: results[i]?.status ?? 'invalid',
    errors: results[i]?.errors ?? [],
  }));

  if (rowInserts.length > 0) {
    const { error: rowsErr } = await service
      .schema('core' as never)
      .from('import_rows' as never)
      .insert(rowInserts as never);
    if (rowsErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'upload-member-import: import_rows INSERT failed',
          error: rowsErr.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
  }

  await logEvent(userClient, ctx, {
    action: 'member.import_validated',
    entitySchema: 'core',
    entityTable: 'import_batches',
    entityId: batchId,
    scopeId: input.scopeId,
    metadata: { total: rows.length, valid: validCount, invalid: invalidCount },
  });

  const body: SuccessBody = {
    batchId,
    totalRows: rows.length,
    validRows: validCount,
    invalidRows: invalidCount,
    traceId: ctx.traceId,
  };
  return withCors(req, success(body, 201));
}
