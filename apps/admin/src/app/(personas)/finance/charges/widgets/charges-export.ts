import type { ExportSpec } from '@/lib/export/workbook';

import type { SerialRow } from './charges-types';

/**
 * Workbook shape for the Charges table.
 *
 * Expected, collected and outstanding are each their own column and
 * each totals, because the question the sheet is opened to answer is
 * almost always "how far short are we, and on what". Coverage is
 * written as a fraction with a percent format rather than as a
 * pre-multiplied number, so the recipient can re-sort and re-total it
 * without the figures turning into nonsense.
 */
export function buildChargesExport(
  rows: readonly SerialRow[],
  meta: readonly { label: string; value: string }[],
): ExportSpec<SerialRow> {
  return {
    filename: 'charges',
    title: 'Charges',
    subtitle: 'Obligations raised across the scopes you can see',
    meta,
    sheetName: 'Charges',
    orientation: 'landscape',
    rows,
    columns: [
      { header: '#', value: (r) => r.serial, width: 6, align: 'center' },
      { header: 'Charge', value: (r) => r.name },
      { header: 'Scope', value: (r) => r.scopeName },
      { header: 'Type', value: (r) => (r.targetPartyType === 'branch' ? 'Group' : 'Individual') },
      { header: 'Shape', value: (r) => r.shape },
      { header: 'Recurrence', value: (r) => r.recurrence.replaceAll('_', ' ') },
      { header: 'Base amount', value: (r) => r.baseAmount ?? '', numFmt: '#,##0', align: 'right' },
      { header: 'Currency', value: (r) => r.currency, width: 10, align: 'center' },
      { header: 'Targets', value: (r) => r.targetCount, width: 9, align: 'right' },
      {
        header: 'Expected',
        value: (r) => r.expected,
        numFmt: '#,##0',
        align: 'right',
        total: true,
      },
      {
        header: 'Collected',
        value: (r) => r.collected,
        numFmt: '#,##0',
        align: 'right',
        total: true,
      },
      {
        header: 'Outstanding',
        value: (r) => Math.max(0, r.expected - r.collected),
        numFmt: '#,##0',
        align: 'right',
        total: true,
      },
      {
        header: 'Coverage',
        value: (r) => (r.expected > 0 ? r.collected / r.expected : 0),
        numFmt: '0.0%',
        width: 11,
        align: 'right',
      },
      { header: 'Status', value: (r) => r.status, width: 11 },
      {
        header: 'Activates',
        value: (r) => (r.activationDate ? new Date(r.activationDate) : null),
        width: 13,
        numFmt: 'dd mmm yyyy',
      },
      { header: 'Description', value: (r) => r.description ?? '' },
    ],
  };
}
