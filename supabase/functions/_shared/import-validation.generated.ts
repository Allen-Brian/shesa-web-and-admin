// GENERATED FILE — DO NOT EDIT.
// Source: packages/domain/src/imports/validation.ts
// Regenerate: pnpm gen:deno-mirrors   ·   Verify: pnpm check:deno-mirrors
//
// Edge Functions run under Deno and cannot import from packages/*, so the
// validator is emitted here instead of being kept in sync by hand.

/**
 * Pure row-level validator for Excel member imports — the single source.
 *
 * `supabase/functions/_shared/import-validation.generated.ts` is emitted
 * from this file by `pnpm gen:deno-mirrors`, and the two Edge Functions
 * that validate imports call it. Do not edit the generated file;
 * `pnpm check:deno-mirrors` fails CI when it stops matching this one.
 *
 * That arrangement replaces a hand-kept mirror whose header said "keep in
 * sync when the template changes". It had already drifted: the Deno copy
 * grew `options.targetBatchScopeId` and this one never did — and since
 * nothing outside the Edge Functions imported this module, the copy under
 * test was not the copy that ran. It is now.
 *
 * Doesn't hit the DB — the `seedContext` supplies the reference sets
 * (batches, houses, networks) needed to resolve labels to scope ids.
 * Duplicate detection is a SEPARATE step (findDuplicateSignals in
 * ../members/duplicate-detection.ts); this fn only asserts each row's
 * standalone validity.
 *
 * Row status semantics:
 *   valid    — every required field present and every reference resolved
 *   invalid  — at least one error attached
 *   pending  — never returned; that's the DB-default before validation
 *
 * Naming note: `sector` was renamed to `network` on 2026-07-02. The
 * template column stays `network` (the CSV column name); the DB column is
 * `members.network_scope_id`.
 */

/* ── inlined from packages/domain/src/members/exit-year.ts ─────────────────────────────── */
/**
 * Exit-year default helper.
 *
 * Phase 1 §2.10: `exit_year` defaults to `entry_year + 7`. Members
 * typically complete their intake path in seven years; the default
 * doesn't create a hard boundary (it's just a metadata field on
 * core.members), it seeds a sensible value the operator can override
 * during creation / import / admin correction.
 *
 * Kept pure + separate from the create-member Edge Function so the
 * client-side import review can preview the same value the server
 * will write.
 */

export const DEFAULT_EXIT_YEAR_OFFSET = 7;

export function defaultExitYear(entryYear: number): number {
  return entryYear + DEFAULT_EXIT_YEAR_OFFSET;
}
/* ── end inline ──────────────────────────────────────────── */

/**
 * Every field is `unknown` because the rows arrive as parsed spreadsheet
 * cells — a "year" column may hand you a number, a string, or a Date. The
 * normalizers below are what turn that into something typed.
 */
export interface ImportRowInput {
  full_name?: unknown;
  display_name?: unknown;
  email?: unknown;
  phone?: unknown;
  batch_entry_year?: unknown;
  house?: unknown;
  network?: unknown;
  field?: unknown;
  entry_year?: unknown;
  exit_year?: unknown;
  current_country?: unknown;
  current_region_state?: unknown;
  current_city?: unknown;
}

export interface SeedContext {
  batchesByYear: Map<number, string>; // year → scope_id
  housesByName: Map<string, string>; // normalized name → scope_id
  networksByName: Map<string, string>; // normalized name → scope_id
}

export interface NormalizedMemberRow {
  full_name: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  batch_scope_id: string;
  house_scope_id: string;
  network_scope_id: string;
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

/**
 * Validate a single import row.
 *
 * `options.targetBatchScopeId` — when the caller already knows which batch
 * the rows belong to (batch-import: the operator is inside a batch, so the
 * target is implicit), pass its scope_id and the validator skips the year
 * lookup and pins `batch_scope_id` to the target. A `batch_entry_year`
 * cell, if present, then only seeds a default `entry_year`; it can no
 * longer override the batch assignment.
 *
 * Omit it (branch / get-or-create flow) and the row's own
 * `batch_entry_year` resolves the batch.
 */
export function validateImportRow(
  raw: ImportRowInput,
  seed: SeedContext,
  options: { targetBatchScopeId?: string | null } = {},
): ValidateRowResult {
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
  if (options.targetBatchScopeId) {
    normalized.batch_scope_id = options.targetBatchScopeId;
  } else if (batchYear == null) {
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

  // Network — required, must resolve.
  const networkName = normalizeString(raw.network);
  if (!networkName) {
    errors.push('network is required');
  } else {
    const networkId = seed.networksByName.get(normalizeKey(networkName));
    if (!networkId) {
      errors.push(`network "${networkName}" does not match a seeded network`);
    } else {
      normalized.network_scope_id = networkId;
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
