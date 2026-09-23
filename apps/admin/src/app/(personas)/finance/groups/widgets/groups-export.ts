import type { ExportSpec } from '@/lib/export/workbook';

import type { SerialGroupRow } from './groups-types';

/**
 * Workbook shape for the Event groups table — one row per group with
 * its roll-up counts and what it has raised, which is the summary a
 * committee asks for when deciding which events to run again.
 */
export function buildGroupsExport(
  rows: readonly SerialGroupRow[],
  meta: readonly { label: string; value: string }[],
): ExportSpec<SerialGroupRow> {
  return {
    filename: 'event-groups',
    title: 'Event groups',
    subtitle: 'Every event group and what it has moved',
    meta,
    sheetName: 'Event groups',
    rows,
    columns: [
      { header: '#', value: (r) => r.serial, width: 6, align: 'center' },
      { header: 'Group', value: (r) => r.name },
      { header: 'Slug', value: (r) => r.slug },
      { header: 'Status', value: (r) => r.status, width: 11 },
      { header: 'Raised', value: (r) => r.raised, numFmt: '#,##0', align: 'right', total: true },
      { header: 'Currency', value: (r) => r.currency, width: 10, align: 'center' },
      { header: 'Charges', value: (r) => r.chargeCount, width: 10, align: 'right', total: true },
      {
        header: 'Transactions',
        value: (r) => r.transactionCount,
        width: 13,
        align: 'right',
        total: true,
      },
      { header: 'Expenses', value: (r) => r.expenseCount, width: 11, align: 'right', total: true },
      {
        header: 'Starts',
        value: (r) => (r.startsOn ? new Date(r.startsOn) : null),
        width: 13,
        numFmt: 'dd mmm yyyy',
      },
      {
        header: 'Ends',
        value: (r) => (r.endsOn ? new Date(r.endsOn) : null),
        width: 13,
        numFmt: 'dd mmm yyyy',
      },
      { header: 'Description', value: (r) => r.description ?? '' },
    ],
  };
}
