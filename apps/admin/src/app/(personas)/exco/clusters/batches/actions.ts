'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage, extractScopeId } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

export type BatchFormState =
  | { ok: true; scopeId?: string }
  | {
      ok: false;
      message?: string;
      fieldErrors?: Partial<Record<BatchFormField, string>>;
      values?: Partial<Record<BatchFormField, string>>;
    };

type BatchFormField =
  | 'name'
  | 'slug'
  | 'entryYear'
  | 'ordinal'
  | 'nickname'
  | 'description'
  | 'contactEmail'
  | 'contactPhone';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENT_YEAR = new Date().getUTCFullYear();

function normalize(form: FormData) {
  const readString = (k: string): string | null => {
    const raw = form.get(k);
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length === 0 ? null : trimmed;
  };
  return {
    scopeId: readString('scopeId'),
    name: readString('name'),
    slug: readString('slug'),
    entryYearRaw: readString('entryYear'),
    ordinalRaw: readString('ordinal'),
    nickname: readString('nickname'),
    description: readString('description'),
    contactEmail: readString('contactEmail'),
    contactPhone: readString('contactPhone'),
  };
}

function validate(v: ReturnType<typeof normalize>, mode: 'create' | 'edit') {
  const fieldErrors: Partial<Record<BatchFormField, string>> = {};

  if (!v.name) fieldErrors.name = 'Batch name is required.';

  if (mode === 'create') {
    if (!v.slug) fieldErrors.slug = 'Slug is required.';
    else if (!SLUG_PATTERN.test(v.slug))
      fieldErrors.slug = 'Slug must be lowercase kebab-case (e.g. batch-2012).';
  }

  let entryYear: number | null = null;
  if (mode === 'create') {
    if (!v.entryYearRaw) fieldErrors.entryYear = 'Entry year is required.';
    else {
      const parsed = Number.parseInt(v.entryYearRaw, 10);
      if (Number.isNaN(parsed) || parsed < 1900 || parsed > CURRENT_YEAR + 5)
        fieldErrors.entryYear = `Entry year must be between 1900 and ${CURRENT_YEAR + 5}.`;
      else entryYear = parsed;
    }
  }

  let ordinal: number | null = null;
  if (v.ordinalRaw) {
    const parsed = Number.parseInt(v.ordinalRaw, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 999)
      fieldErrors.ordinal = 'Ordinal must be a positive integer under 1000.';
    else ordinal = parsed;
  }

  if (v.contactEmail && !EMAIL_PATTERN.test(v.contactEmail))
    fieldErrors.contactEmail = 'Contact email is not a valid address.';

  return { fieldErrors, entryYear, ordinal };
}

function preserve(v: ReturnType<typeof normalize>) {
  return {
    name: v.name ?? '',
    slug: v.slug ?? '',
    entryYear: v.entryYearRaw ?? '',
    ordinal: v.ordinalRaw ?? '',
    nickname: v.nickname ?? '',
    description: v.description ?? '',
    contactEmail: v.contactEmail ?? '',
    contactPhone: v.contactPhone ?? '',
  };
}

export async function createBatch(
  _prev: BatchFormState,
  formData: FormData,
): Promise<BatchFormState> {
  const v = normalize(formData);
  const { fieldErrors, entryYear, ordinal } = validate(v, 'create');
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values: preserve(v) };
  }

  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('batches/create-batch', {
    body: {
      name: v.name,
      slug: v.slug,
      entryYear,
      ordinal,
      nickname: v.nickname,
      description: v.description,
      contactEmail: v.contactEmail,
      contactPhone: v.contactPhone,
    },
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not create the batch.'),
      values: preserve(v),
    };
  }
  const scopeId = extractScopeId(data);
  if (!scopeId) {
    return {
      ok: false,
      message: 'Create succeeded but returned no scope id.',
      values: preserve(v),
    };
  }

  revalidatePath('/exco/clusters/batches');
  return { ok: true, scopeId };
}

export async function updateBatch(
  _prev: BatchFormState,
  formData: FormData,
): Promise<BatchFormState> {
  const v = normalize(formData);
  if (!v.scopeId) {
    return { ok: false, message: 'Missing batch id.', values: preserve(v) };
  }
  const { fieldErrors, ordinal } = validate(v, 'edit');
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values: preserve(v) };
  }

  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('batches/update-batch', {
    body: {
      scopeId: v.scopeId,
      name: v.name,
      ordinal,
      nickname: v.nickname,
      description: v.description,
      contactEmail: v.contactEmail,
      contactPhone: v.contactPhone,
    },
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not save the batch.'),
      values: preserve(v),
    };
  }

  revalidatePath('/exco/clusters/batches', 'layout');
  return { ok: true, scopeId: v.scopeId };
}

export interface ArchiveResult {
  readonly ok: boolean;
  readonly scopeId: string;
  readonly message?: string;
}

export async function archiveBatch(scopeId: string): Promise<ArchiveResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('batches/update-batch', {
    body: { scopeId, status: 'archived' },
  });
  if (error) {
    return { ok: false, scopeId, message: await extractInvokeMessage(error, 'Could not archive.') };
  }
  revalidatePath('/exco/clusters/batches', 'layout');
  return { ok: true, scopeId };
}

export async function restoreBatch(scopeId: string): Promise<ArchiveResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('batches/update-batch', {
    body: { scopeId, status: 'active' },
  });
  if (error) {
    return { ok: false, scopeId, message: await extractInvokeMessage(error, 'Could not restore.') };
  }
  revalidatePath('/exco/clusters/batches', 'layout');
  return { ok: true, scopeId };
}

// ─── Batch members ──────────────────────────────────────────────────
// Batches are the single system entry-point for adding members (2026-07-05
// lock). Both single-add and import are wired from the Batch details page.

export interface ImportSummary {
  readonly batchId: string;
  readonly totalRows: number;
  readonly validRows: number;
  readonly invalidRows: number;
}

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

// ─── Invalid-row edit + re-validate ─────────────────────────────────
// After parse, the review dialog surfaces rows whose validation failed.
// The operator can fix them in-place (cell-level edits to normalized_data)
// and re-run validation without re-uploading the file.

export interface InvalidImportRow {
  readonly id: string;
  readonly rowNumber: number;
  readonly fullName: string | null;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly batchEntryYear: number | null;
  readonly house: string | null;
  readonly network: string | null;
  readonly errors: readonly string[];
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

  // Merge on top of the existing normalized_data so we don't lose
  // fields the operator didn't touch.
  const { data: existing, error: readErr } = await supabase
    .schema('core')
    .from('import_rows')
    .select('normalized_data')
    .eq('id', input.rowId)
    .maybeSingle();
  if (readErr) return { ok: false, message: readErr.message };

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

/**
 * Commits every valid row in the import batch as a real
 * `core.members` record. Idempotent per the Edge Function's
 * `WHERE status = 'validated'` guard.
 *
 * Per the 2026-07-05 lock, importing members ALSO sends out an invite
 * to every created member whose row has an email. Invites go out in
 * parallel via `members/send-invite`; per-row failures are counted but
 * don't fail the overall confirm — an imported member without a working
 * email still lands in the roster, and the Invites page will show a
 * failed row that the admin can resend later.
 */
export async function confirmMemberImport(input: { batchId: string; batchSlug: string }): Promise<
  | {
      ok: true;
      createdRows: number;
      invitesSent: number;
      invitesFailed: number;
      invitesSkipped: number;
    }
  | { ok: false; message: string }
> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('imports/confirm-member-import', {
    body: { batchId: input.batchId },
  });
  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not commit the import.'),
    };
  }
  const body = data as { createdRows?: number };
  const createdRows = body?.createdRows ?? 0;

  // Fan out invites for the freshly-created rows. The import Edge
  // Function returns just the count, so we re-query the rows created
  // by this batch to get their member IDs + emails.
  let invitesSent = 0;
  let invitesFailed = 0;
  let invitesSkipped = 0;
  if (createdRows > 0) {
    const { data: importRows } = await supabase
      .schema('core')
      .from('import_rows')
      .select('created_member_id')
      .eq('import_batch_id', input.batchId)
      .not('created_member_id', 'is', null);
    const memberIds = (importRows ?? [])
      .map((r) => r.created_member_id)
      .filter((id): id is string => !!id);

    if (memberIds.length > 0) {
      const { data: createdMembers } = await supabase
        .schema('core')
        .from('members')
        .select('id, email')
        .in('id', memberIds);

      const results = await Promise.all(
        (createdMembers ?? []).map(async (m) => {
          if (!m.email) return { skipped: true } as const;
          const { error: inviteErr } = await supabase.functions.invoke('members/send-invite', {
            body: { memberId: m.id },
          });
          if (inviteErr) {
            console.error('confirmMemberImport: send-invite failed', {
              memberId: m.id,
              error: inviteErr.message,
            });
            return { failed: true } as const;
          }
          return { sent: true } as const;
        }),
      );
      for (const r of results) {
        if ('sent' in r) invitesSent += 1;
        else if ('failed' in r) invitesFailed += 1;
        else if ('skipped' in r) invitesSkipped += 1;
      }
    }
  }

  revalidatePath(`/exco/clusters/batches/${input.batchSlug}`);
  return { ok: true, createdRows, invitesSent, invitesFailed, invitesSkipped };
}

export interface CreateBatchMemberInput {
  readonly batchScopeId: string;
  readonly batchSlug: string;
  readonly fullName: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly houseScopeId: string;
  readonly networkScopeId: string;
  readonly entryYear: number | null;
  readonly exitYear: number | null;
  readonly currentCountry: string | null;
  readonly currentRegionState: string | null;
  readonly currentCity: string | null;
}

export type CreateBatchMemberResult =
  { ok: true; memberId: string } | { ok: false; message: string };

export async function createBatchMember(
  input: CreateBatchMemberInput,
): Promise<CreateBatchMemberResult> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('members/create-member', {
    body: {
      fullName: input.fullName,
      displayName: input.displayName,
      email: input.email,
      phone: input.phone,
      batchScopeId: input.batchScopeId,
      houseScopeId: input.houseScopeId,
      networkScopeId: input.networkScopeId,
      entryYear: input.entryYear,
      exitYear: input.exitYear,
      currentCountry: input.currentCountry,
      currentRegionState: input.currentRegionState,
      currentCity: input.currentCity,
    },
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not create member.') };
  }
  const memberId = (data as { memberId?: string } | null)?.memberId ?? null;
  if (!memberId) {
    return { ok: false, message: 'Create succeeded but returned no member id.' };
  }
  revalidatePath(`/exco/clusters/batches/${input.batchSlug}`);
  return { ok: true, memberId };
}

export interface DeleteBatchMemberResult {
  readonly ok: boolean;
  readonly memberId: string;
  readonly message?: string;
}

/**
 * Deletes a member row entirely. Guard: refuses if the member currently
 * holds an active or passive membership at a branch or autonomous
 * chapter — those relationships have to be closed first (transfer out,
 * or remove from scope) before the member row can be deleted.
 *
 * Runs under the caller's JWT. RLS on `core.members` restricts DELETE
 * to admins with `member.manage`; this action is a thin glue over that.
 */
export async function deleteBatchMember(input: {
  readonly memberId: string;
  readonly batchSlug: string;
}): Promise<DeleteBatchMemberResult> {
  const supabase = await getServerClient();

  const { data: activeMemberships } = await supabase
    .schema('core')
    .from('memberships')
    .select('id, scope_id, membership_status')
    .eq('member_id', input.memberId)
    .in('membership_status', ['active', 'passive'])
    .limit(1);

  if ((activeMemberships ?? []).length > 0) {
    return {
      ok: false,
      memberId: input.memberId,
      message:
        'Member is still attached to a branch. Close the membership there before deleting the member row.',
    };
  }

  const { error } = await supabase.schema('core').from('members').delete().eq('id', input.memberId);

  if (error) {
    return { ok: false, memberId: input.memberId, message: error.message };
  }
  revalidatePath(`/exco/clusters/batches/${input.batchSlug}`);
  return { ok: true, memberId: input.memberId };
}
