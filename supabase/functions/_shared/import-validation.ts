/**
 * Shared Excel-import validation logic — server-side mirror of the pure
 * function in `packages/domain/src/imports/validation.ts`.
 *
 * Deno Edge Functions can't cross the monorepo import boundary into
 * `packages/*`, so this is a hand-kept mirror. Keep in sync when the
 * Phase 1 §7.1 template changes — commitlint won't catch the drift,
 * but a validate-member-import that accepts what the SPA won't will
 * feel like a bug.
 */

export interface SeedContext {
  batchesByYear: Map<number, string>;
  housesByName: Map<string, string>;
  sectorsByName: Map<string, string>;
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

export interface ImportRowInput {
  full_name?: unknown;
  display_name?: unknown;
  email?: unknown;
  phone?: unknown;
  batch_entry_year?: unknown;
  house?: unknown;
  sector?: unknown;
  field?: unknown;
  entry_year?: unknown;
  exit_year?: unknown;
  current_country?: unknown;
  current_region_state?: unknown;
  current_city?: unknown;
}

export interface ValidateRowResult {
  status: 'valid' | 'invalid';
  errors: string[];
  normalized: Partial<NormalizedMemberRow>;
}

const DEFAULT_EXIT_YEAR_OFFSET = 7;

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

  const fullName = normalizeString(raw.full_name);
  if (!fullName) errors.push('full_name is required');
  else normalized.full_name = fullName;

  const email = normalizeString(raw.email);
  const phone = normalizeString(raw.phone);
  if (!email && !phone) errors.push('email or phone is required');
  normalized.email = email ? email.toLowerCase() : null;
  normalized.phone = phone;

  normalized.display_name = normalizeString(raw.display_name);

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

  const houseName = normalizeString(raw.house);
  if (!houseName) {
    errors.push('house is required');
  } else {
    const houseId = seed.housesByName.get(normalizeKey(houseName));
    if (!houseId) errors.push(`house "${houseName}" does not match a seeded house`);
    else normalized.house_scope_id = houseId;
  }

  const sectorName = normalizeString(raw.sector);
  if (!sectorName) {
    errors.push('sector is required');
  } else {
    const sectorId = seed.sectorsByName.get(normalizeKey(sectorName));
    if (!sectorId) errors.push(`sector "${sectorName}" does not match a seeded sector`);
    else normalized.sector_scope_id = sectorId;
  }

  normalized.field = normalizeString(raw.field);
  normalized.entry_year = normalizeYear(raw.entry_year) ?? batchYear ?? null;
  const rawExit = normalizeYear(raw.exit_year);
  normalized.exit_year =
    rawExit ??
    (normalized.entry_year != null ? normalized.entry_year + DEFAULT_EXIT_YEAR_OFFSET : null);

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

/**
 * Build a SeedContext by querying core.scopes. Uses whichever Supabase
 * client the caller provides — service_role for the internal path,
 * user JWT for the user-facing validate step.
 */
export async function loadSeedContext(supabase: {
  from: (t: string) => {
    select: (cols: string) => {
      in: (col: string, vals: readonly string[]) => Promise<{ data: unknown; error: unknown }>;
    };
  };
}): Promise<SeedContext> {
  // Query all mainstream-scoped anchor rows in one go and partition
  // client-side. This is fast (< 100 rows total) and dodges three
  // sequential round-trips.
  const { data, error } = await supabase
    .from('scopes')
    .select('id, name, scope_type, entry_year')
    .in('scope_type', ['batch', 'house', 'sector']);
  if (error) throw error;

  const batchesByYear = new Map<number, string>();
  const housesByName = new Map<string, string>();
  const sectorsByName = new Map<string, string>();

  for (const row of (data as Array<{
    id: string;
    name: string;
    scope_type: string;
    entry_year: number | null;
  }>) ?? []) {
    if (row.scope_type === 'batch' && row.entry_year != null) {
      batchesByYear.set(row.entry_year, row.id);
    } else if (row.scope_type === 'house') {
      housesByName.set(row.name.trim().toLowerCase(), row.id);
    } else if (row.scope_type === 'sector') {
      sectorsByName.set(row.name.trim().toLowerCase(), row.id);
    }
  }

  return { batchesByYear, housesByName, sectorsByName };
}
