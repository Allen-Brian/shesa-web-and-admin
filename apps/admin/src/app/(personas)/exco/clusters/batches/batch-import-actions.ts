'use server';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

import type { ImportSummary, InvalidImportRow } from './batch-import-types';

/**
 * Uploads the raw import file to the `member-imports` bucket AND kicks
 * off parse+validate in one Server Action round-trip.
 *
 * Historical note: this used to be split into (1) client uploads via
 * the browser Supabase client → (2) server action calls the edge fn.
 * That worked until the auth cookies were switched to httpOnly (ADR-0014)
 * — then the browser client couldn't read the session, storage saw the
 * request as anon, and the RLS INSERT policy rejected with
 *   "new row violates row-level security policy"
 * regardless of what the operator's actual role was. Moving the upload
 * server-side uses the same cookie-based auth every other write in the
 * app already relies on.
 */
export async function uploadAndParseMemberImport(input: {
  scopeId: string;
  file: File;
}): Promise<{ ok: true; summary: ImportSummary } | { ok: false; message: string }> {
  const supabase = await getServerClient();

  const timestamp = Date.now();
  const safeName = input.file.name.replace(/[^\w.-]+/g, '_');
  const storagePath = `${input.scopeId}/${timestamp}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from('member-imports')
    .upload(storagePath, input.file, { cacheControl: '3600', upsert: false });

  if (upErr) {
    return { ok: false, message: upErr.message || 'File upload failed.' };
  }

  return uploadMemberImport({
    scopeId: input.scopeId,
    fileName: input.file.name,
    storagePath,
  });
}

/**
 * Fetch every invalid row in a batch so the dialog can render an inline
 * editor. Read only — updates come through `saveImportRowEdits`.
 */
export async function fetchInvalidImportRows(
  batchId: string,
): Promise<{ ok: true; rows: InvalidImportRow[] } | { ok: false; message: string }> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('core')
    .from('import_rows')
    .select('id, row_number, raw_data, normalized_data, errors')
    .eq('import_batch_id', batchId)
    .eq('validation_status', 'invalid')
    .order('row_number');
  if (error) return { ok: false, message: error.message };

  const rows = (data ?? []).map((r) => {
    const raw = (r.raw_data ?? {}) as Record<string, unknown>;
    const norm = (r.normalized_data ?? {}) as Record<string, unknown>;
    // Prefer normalized values (they've been coerced already), fall
    // back to raw. The dialog edits normalized_data so downstream
    // validate-member-import re-runs cleanly.
    const pick = (k: string) => (norm[k] ?? raw[k] ?? null) as string | number | null;
    const asStr = (v: string | number | null) => (v == null || v === '' ? null : String(v));
    const asYear = (v: string | number | null) => {
      if (v == null || v === '') return null;
      const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10);
      return Number.isFinite(n) ? n : null;
    };
    return {
      id: r.id,
      rowNumber: r.row_number,
      fullName: asStr(pick('full_name')),
      displayName: asStr(pick('display_name')),
      email: asStr(pick('email')),
      phone: asStr(pick('phone')),
      batchEntryYear: asYear(pick('batch_entry_year')),
      house: asStr(pick('house')),
      network: asStr(pick('network')),
      errors: Array.isArray(r.errors) ? (r.errors as string[]) : [],
    };
  });
  return { ok: true, rows };
}

/**
 * Patch a single invalid row's normalized_data with the fixed values
 * and flip its status back to `pending` so the next revalidate pass
 * picks it up.
 */
export async function saveImportRowEdits(input: {
  rowId: string;
  edits: Partial<{
    full_name: string | null;
    display_name: string | null;
    email: string | null;
    phone: string | null;
    batch_entry_year: number | null;
    house: string | null;
    network: string | null;
  }>;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await getServerClient();

  const { data: existing, error: readErr } = await supabase
    .schema('core')
    .from('import_rows')
    .select('normalized_data')
    .eq('id', input.rowId)
    .maybeSingle();
  if (readErr) return { ok: false, message: readErr.message };

  // Merge on top of the existing normalized_data so we don't lose
  // fields the operator didn't touch.
  const current = (existing?.normalized_data ?? {}) as Record<string, unknown>;
  const next: Record<string, unknown> = { ...current };
  for (const [k, v] of Object.entries(input.edits)) {
    if (v === undefined) continue;
    if (v === null || v === '') {
      delete next[k];
    } else {
      next[k] = v;
    }
  }

  const { error } = await supabase
    .schema('core')
    .from('import_rows')
    .update({
      normalized_data: next as never,
      validation_status: 'pending',
    })
    .eq('id', input.rowId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/**
 * Re-run validation across the batch after edits. Returns updated
 * counts so the summary in the dialog can refresh in-place.
 */
export async function revalidateImportBatch(
  batchId: string,
): Promise<
  | { ok: true; totalRows: number; validRows: number; invalidRows: number }
  | { ok: false; message: string }
> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('imports/validate-member-import', {
    body: { batchId },
  });
  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not re-validate the batch.'),
    };
  }
  const body = data as { totalRows?: number; validRows?: number; invalidRows?: number };
  return {
    ok: true,
    totalRows: body.totalRows ?? 0,
    validRows: body.validRows ?? 0,
    invalidRows: body.invalidRows ?? 0,
  };
}

/**
 * Kicks off a member import: the client has already uploaded the raw
 * xlsx to the `member-imports` bucket; we hand the storage path off to
 * `imports/upload-member-import` which parses + validates every row
 * against the seed catalog and returns a batch summary.
 */
export async function uploadMemberImport(input: {
  scopeId: string;
  fileName: string;
  storagePath: string;
}): Promise<{ ok: true; summary: ImportSummary } | { ok: false; message: string }> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('imports/upload-member-import', {
    body: input,
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not parse the import.') };
  }
  const body = data as {
    batchId?: string;
    totalRows?: number;
    validRows?: number;
    invalidRows?: number;
  };
  if (!body?.batchId) {
    return { ok: false, message: 'Import parse succeeded but returned no batch id.' };
  }
  return {
    ok: true,
    summary: {
      batchId: body.batchId,
      totalRows: body.totalRows ?? 0,
      validRows: body.validRows ?? 0,
      invalidRows: body.invalidRows ?? 0,
    },
  };
}
