import type { ExportSpec } from '@/lib/export/workbook';

import type { SerialRow } from './contributions-types';

/**
 * Workbook shape for the Contributions table.
 *
 * Goal and raised sit next to each other with the shortfall computed
 * between them, so a campaign that is behind is visible without the
 * recipient writing a formula. Shapes without a goal (open, fixed)
 * leave both the goal and the shortfall blank rather than writing a
 * zero, which would read as "target met".
 */
export function buildContributionsExport(
  rows: readonly SerialRow[],
  meta: readonly { label: string; value: string }[],
): ExportSpec<SerialRow> {
  return {
    filename: 'contributions',
    title: 'Contributions',
    subtitle: 'Goal, open, ticketed and fixed contributions across your scopes',
    meta,
    sheetName: 'Contributions',
    orientation: 'landscape',
    rows,
    columns: [
      { header: '#', value: (r) => r.serial, width: 6, align: 'center' },
      { header: 'Contribution', value: (r) => r.name },
      { header: 'Scope', value: (r) => r.scopeName },
      { header: 'Event group', value: (r) => r.groupName ?? '' },
      { header: 'Shape', value: (r) => r.shape, width: 11 },
      { header: 'Unit amount', value: (r) => r.baseAmount ?? '', numFmt: '#,##0', align: 'right' },
      { header: 'Goal', value: (r) => r.goalAmount ?? '', numFmt: '#,##0', align: 'right' },
      { header: 'Raised', value: (r) => r.raised, numFmt: '#,##0', align: 'right', total: true },
      {
        header: 'Shortfall',
        value: (r) => (r.goalAmount == null ? '' : Math.max(0, r.goalAmount - r.raised)),
        numFmt: '#,##0',
        align: 'right',
        total: true,
      },
      {
        header: 'Contributors',
        value: (r) => r.contributorCount,
        width: 13,
        align: 'right',
        total: true,
      },
      { header: 'Capacity', value: (r) => r.capacity ?? '', width: 10, align: 'right' },
      { header: 'Currency', value: (r) => r.currency, width: 10, align: 'center' },
      { header: 'Lifecycle', value: (r) => r.lifecycle ?? '', width: 11 },
      {
        header: 'Opens',
        value: (r) => (r.openDate ? new Date(r.openDate) : null),
        width: 13,
        numFmt: 'dd mmm yyyy',
      },
      {
        header: 'Closes',
        value: (r) => (r.closeDate ? new Date(r.closeDate) : null),
        width: 13,
        numFmt: 'dd mmm yyyy',
      },
      { header: 'Description', value: (r) => r.description ?? '' },
    ],
  };
}
