/**
 * Excel parsing seam — SheetJS-backed today, swappable to exceljs or
 * xlsx-populate if the bundle-size or perf profile turns out to hurt
 * in production. The one-file abstraction is the entire point of the
 * Phase 1 plan's E1.3 go/no-go gate.
 *
 * SheetJS (`xlsx` npm) supports Deno per the official docs
 * (https://docs.sheetjs.com/docs/getting-started/installation/deno/)
 * via `import * as XLSX from 'npm:xlsx@0.18.5'`. Bundle is ~1 MB
 * against Supabase Edge Functions' generous limit; parse is
 * synchronous and well within Deno's default memory ceiling for a
 * few thousand rows.
 *
 * If a production deploy shows the bundle or the runtime cost is a
 * real problem, the pivot cost is: replace this file with an exceljs
 * or xlsx-populate implementation that fulfills the same
 * `parseXlsxToRows(bytes) → SheetRow[]` contract. Neither call site
 * (`upload-member-import`, `validate-member-import`) changes.
 */

import * as XLSX from 'npm:xlsx@0.18.5';

export type SheetRow = Record<string, unknown>;

/**
 * Parse an .xlsx byte payload into an array of row objects keyed by
 * the sheet's header row.
 *
 * - Uses the first sheet only (Phase 1 templates are single-sheet).
 * - Trims + lowercases header keys so `full_name` / `Full Name`
 *   / `FULL_NAME` all normalize the same way.
 * - `raw: false` opts SheetJS into its own value coercion (dates to
 *   strings, numbers to numbers) — good default for our string-heavy
 *   member catalog.
 */
export function parseXlsxToRows(bytes: Uint8Array): SheetRow[] {
  const workbook = XLSX.read(bytes, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    defval: null,
  });

  // Normalize header casing / whitespace once so the downstream
  // validator can rely on a single canonical shape.
  return rawRows.map((row) => {
    const out: SheetRow = {};
    for (const [k, v] of Object.entries(row)) {
      const key = k.trim().toLowerCase().replace(/\s+/g, '_');
      out[key] = v;
    }
    return out;
  });
}
