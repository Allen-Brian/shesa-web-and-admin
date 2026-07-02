/**
 * Pure row-level validator for Excel member imports.
 *
 * Same function is called by:
 *   - The `upload-member-import` Edge Function (server, on parse).
 *   - The Exco UI's import review screen (client, on inline edit).
 *
 * Doesn't hit the DB — the `seedContext` supplies the reference sets
 * (batches, houses, sectors) needed to resolve labels to scope ids.
 * Duplicate detection is a SEPARATE step (findDuplicateSignals in
 * ../members/duplicate-detection.ts); this fn only asserts each row's
 * standalone validity.
 *
 * Row status semantics:
 *   valid    — every required field present and every reference resolved
 *   invalid  — at least one error attached
 *   pending  — never returned; that's the DB-default before validation
 */

import { defaultExitYear } from '../members/exit-year';

export type ImportRowInput = {
  full_name?: string;
  display_name?: string;
  email?: string;
  phone?: string;
  batch_entry_year?: string | number;
  house?: string;
  sector?: string;
  field?: string;
  entry_year?: string | number;
  exit_year?: string | number;
  current_country?: string;
  current_region_state?: string;
  current_city?: string;
};

export interface SeedContext {
  batchesByYear: Map<number, string>; // year → scope_id
  housesByName: Map<string, string>; // normalized name → scope_id
  sectorsByName: Map<string, string>; // normalized name → scope_id
}

export interface NormalizedMemberRow {
  full_name: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  batch_scope_id: string;
  house_scope_id: string;
  sector_scope_id: string;
  field: string | null;
  entry_year: number | null;
  exit_year: number | null;
  current_country: string | null;
  current_region_state: string | null;
  current_city: string | null;
}

export interface ValidateRowResult {
  status: 'valid' | 'invalid';
  errors: string[];
  normalized: Partial<NormalizedMemberRow>;
}

const normalizeKey = (v: string) => v.trim().toLowerCase();
const normalizeString = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
};
const normalizeYear = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : null;
};

export function validateImportRow(raw: ImportRowInput, seed: SeedContext): ValidateRowResult {
  const errors: string[] = [];
  const normalized: Partial<NormalizedMemberRow> = {};

  // Required-string fields.
  const fullName = normalizeString(raw.full_name);
  if (!fullName) errors.push('full_name is required');
  else normalized.full_name = fullName;

  // Email / phone — at least one required.
  const email = normalizeString(raw.email);
  const phone = normalizeString(raw.phone);
  if (!email && !phone) errors.push('email or phone is required');
  normalized.email = email ? email.toLowerCase() : null;
  normalized.phone = phone;

  // display_name defaults to null; member can edit later.
  normalized.display_name = normalizeString(raw.display_name);

  // Batch — required, must resolve.
  const batchYear = normalizeYear(raw.batch_entry_year);
  if (batchYear == null) {
    errors.push('batch_entry_year is required');
  } else {
    const batchId = seed.batchesByYear.get(batchYear);
    if (!batchId) {
      errors.push(`batch_entry_year ${batchYear} does not match a seeded batch`);
    } else {
      normalized.batch_scope_id = batchId;
    }
  }

  // House — required, must resolve.
  const houseName = normalizeString(raw.house);
  if (!houseName) {
    errors.push('house is required');
  } else {
    const houseId = seed.housesByName.get(normalizeKey(houseName));
    if (!houseId) {
      errors.push(`house "${houseName}" does not match a seeded house`);
    } else {
      normalized.house_scope_id = houseId;
    }
  }

  // Sector — required, must resolve.
  const sectorName = normalizeString(raw.sector);
  if (!sectorName) {
    errors.push('sector is required');
  } else {
    const sectorId = seed.sectorsByName.get(normalizeKey(sectorName));
    if (!sectorId) {
      errors.push(`sector "${sectorName}" does not match a seeded sector`);
    } else {
      normalized.sector_scope_id = sectorId;
    }
  }

  // Optional attributes.
  normalized.field = normalizeString(raw.field);
  normalized.entry_year = normalizeYear(raw.entry_year) ?? batchYear ?? null;
  const rawExit = normalizeYear(raw.exit_year);
  normalized.exit_year =
    rawExit ?? (normalized.entry_year != null ? defaultExitYear(normalized.entry_year) : null);

  // Reject exit before entry (mirrors DB CHECK).
  if (
    normalized.entry_year != null &&
    normalized.exit_year != null &&
    normalized.exit_year < normalized.entry_year
  ) {
    errors.push('exit_year cannot precede entry_year');
  }

  normalized.current_country = normalizeString(raw.current_country);
  normalized.current_region_state = normalizeString(raw.current_region_state);
  normalized.current_city = normalizeString(raw.current_city);

  return {
    status: errors.length === 0 ? 'valid' : 'invalid',
    errors,
    normalized,
  };
}
