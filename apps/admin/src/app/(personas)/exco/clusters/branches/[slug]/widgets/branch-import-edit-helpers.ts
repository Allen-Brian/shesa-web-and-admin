import type { AttachOutcome, AttachRow } from './branch-import-types';
import type { BranchImportRowEdits } from './branch-import-types';

/**
 * Merge an edit patch (all UI-side strings) on top of the row we sent
 * originally. Empty strings become null so the server treats them as
 * "clear this field" rather than "keep the old value".
 */
export function applyBranchImportPatch(row: AttachRow, patch: BranchImportRowEdits): AttachRow {
  const nextStr = (k: keyof BranchImportRowEdits, current: string | null | undefined) =>
    patch[k] !== undefined
      ? patch[k]!.trim() === ''
        ? null
        : patch[k]!.trim()
      : (current ?? null);
  const nextYear = (): number | null => {
    if (patch.batchEntryYear === undefined) return row.batchEntryYear ?? null;
    const raw = patch.batchEntryYear.trim();
    if (raw === '') return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  };
  return {
    ...row,
    memberCode: nextStr('memberCode', row.memberCode),
    fullName: nextStr('fullName', row.fullName),
    displayName: nextStr('displayName', row.displayName),
    email: nextStr('email', row.email),
    phone: nextStr('phone', row.phone),
    batchEntryYear: nextYear(),
    house: nextStr('house', row.house),
    network: nextStr('network', row.network),
  };
}

/**
 * Stable key for an issue row — used to figure out which issues from
 * the retry are actually the SAME rows as those in the previous pass
 * (identifier can change between passes, so rowIndex is safer).
 */
export function branchImportRowKey(
  o: Extract<AttachOutcome, { kind: 'not_found' | 'failed' }>,
): string {
  return String(o.rowIndex);
}
