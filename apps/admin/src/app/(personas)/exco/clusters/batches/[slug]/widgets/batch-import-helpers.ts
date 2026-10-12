import { saveImportRowEdits } from '../../batch-import-actions';

import type { BatchImportRowEdits } from './batch-import-types';

/**
 * Convert dialog-facing edit payload (all strings) to the shape the
 * server action wants (typed keys matching normalized_data column
 * names).
 */
export function toEditsPayload(
  patch: BatchImportRowEdits,
): Parameters<typeof saveImportRowEdits>[0]['edits'] {
  const out: Parameters<typeof saveImportRowEdits>[0]['edits'] = {};
  if (patch.fullName !== undefined) out.full_name = patch.fullName.trim() || null;
  if (patch.displayName !== undefined) out.display_name = patch.displayName.trim() || null;
  if (patch.email !== undefined) out.email = patch.email.trim().toLowerCase() || null;
  if (patch.phone !== undefined) out.phone = patch.phone.trim() || null;
  if (patch.batchEntryYear !== undefined) {
    const raw = patch.batchEntryYear.trim();
    out.batch_entry_year = raw === '' ? null : Number.parseInt(raw, 10);
  }
  if (patch.house !== undefined) out.house = patch.house.trim() || null;
  if (patch.network !== undefined) out.network = patch.network.trim() || null;
  return out;
}

/**
 * Storage errors bubble raw Postgres/PostgREST text like
 *   "new row violates row-level security policy for table \"objects\""
 * which is technically accurate but unactionable in a toast. Map the
 * common ones to something an operator can act on.
 */
export function friendlyStorageError(raw: string | undefined | null): string {
  if (!raw) return 'File upload failed.';
  const lower = raw.toLowerCase();
  if (lower.includes('row-level security') || lower.includes('policy')) {
    return 'You don’t have permission to upload member imports at this scope. Ask a Mainstream admin to grant member.import.';
  }
  if (lower.includes('mime type') && lower.includes('not supported')) {
    return `${raw} — try a .csv or .xlsx file.`;
  }
  if (lower.includes('exceed') && lower.includes('size')) {
    return 'File is too large. The member-imports bucket caps individual uploads at 10 MB.';
  }
  return raw;
}
