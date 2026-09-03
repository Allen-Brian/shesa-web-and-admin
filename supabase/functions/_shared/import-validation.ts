/**
 * The Edge Functions' entry point for member-import validation.
 *
 * The pure row validator is NOT written here — it is generated from
 * `packages/domain/src/imports/validation.ts` into
 * `./import-validation.generated.ts` and re-exported below, so the
 * implementation the Edge Functions run is the implementation
 * `packages/domain/src/imports/validation.test.ts` covers. See
 * `scripts/gen-deno-mirrors.mjs`.
 *
 * What stays hand-written is `loadSeedContext`: it queries `core.scopes`,
 * so it belongs on the server side and has no place in a pure domain
 * module.
 *
 * Naming note: "sector" was renamed to "network" on 2026-07-02. The
 * template column stays `network` (the CSV column name); the DB column is
 * `members.network_scope_id`.
 */

export {
  DEFAULT_EXIT_YEAR_OFFSET,
  defaultExitYear,
  validateImportRow,
} from './import-validation.generated.ts';
export type {
  ImportRowInput,
  NormalizedMemberRow,
  SeedContext,
  ValidateRowResult,
} from './import-validation.generated.ts';

import type { SeedContext } from './import-validation.generated.ts';

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
    .schema('core' as never)
    .from('scopes' as never)
    .select('id, name, scope_type, entry_year')
    .in('scope_type', ['batch', 'house', 'network']);
  if (error) throw error;

  const batchesByYear = new Map<number, string>();
  const housesByName = new Map<string, string>();
  const networksByName = new Map<string, string>();

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
    } else if (row.scope_type === 'network') {
      networksByName.set(row.name.trim().toLowerCase(), row.id);
    }
  }

  return { batchesByYear, housesByName, networksByName };
}
