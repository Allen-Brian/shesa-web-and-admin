import type { ExportMeta } from './workbook';

/**
 * Turns a view's filter state into the letterhead's "filters in force"
 * line, dropping anything that is not actually narrowing the table.
 *
 * Only the filters a person chose belong on the report. Printing
 * "Status: all · Category: all · Group: all" on a sheet nobody filtered
 * buries the one narrowing that did happen, and a recipient who reads
 * the letterhead to find out what they are looking at has to work out
 * which of those lines means anything.
 *
 * `all`, empty strings and nullish values are all treated as "not
 * filtered", which is the sentinel every finance view already uses.
 */
export function activeFilters(entries: Record<string, string | null | undefined>): ExportMeta[] {
  return Object.entries(entries)
    .filter(([, value]) => value != null && value !== '' && value !== 'all')
    .map(([label, value]) => ({ label, value: value as string }));
}

/**
 * The same thing for tables driven by `useFilterState`, whose values
 * are multi-select lists keyed by dimension. Dimension keys are
 * lower-case slugs (`targetPartyType`, `status`), so they are
 * de-camelised into something a reader recognises.
 */
export function filterValuesToMeta(
  values: Record<string, readonly string[] | undefined>,
): ExportMeta[] {
  return Object.entries(values)
    .filter(([, list]) => list && list.length > 0)
    .map(([dim, list]) => ({ label: humanise(dim), value: list!.join(', ') }));
}

/** `'targetPartyType'` → `'Target party type'`. */
function humanise(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replaceAll('_', ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** `'2026-01-01' + '2026-03-31'` → `'2026-01-01 → 2026-03-31'`. */
export function windowLabel(from: string, to: string): string | null {
  if (!from && !to) return null;
  return `${from || 'beginning'} → ${to || 'today'}`;
}
