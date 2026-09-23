import type { ExportSpec } from '@/lib/export/workbook';

import type { SerialRow } from './expenses-types';

/**
 * Workbook shape for the Expenses table.
 *
 * The Amount column is signed the way the table signs it — negative for
 * money going out, positive for a reversal putting it back — so the
 * total at the foot is the net effect on the treasury rather than the
 * sum of everything ever typed in. An unsigned column would total to a
 * figure that matches no account.
 */
export function buildExpensesExport(
  rows: readonly SerialRow[],
  meta: readonly { label: string; value: string }[],
): ExportSpec<SerialRow> {
  return {
    filename: 'expenses',
    title: 'Expenses',
    subtitle: 'Money out, by payee and category',
    meta,
    sheetName: 'Expenses',
    orientation: 'landscape',
    rows,
    columns: [
      { header: 'S/N', value: (r) => r.serial, width: 7, align: 'center' },
      {
        header: 'Incurred',
        value: (r) => (r.incurredAt ? new Date(r.incurredAt) : null),
        width: 13,
        numFmt: 'dd mmm yyyy',
      },
      { header: 'Payee', value: (r) => r.payee },
      { header: 'Category', value: (r) => r.categoryName ?? '' },
      { header: 'Scope', value: (r) => r.scopeName },
      { header: 'Event group', value: (r) => r.groupName ?? '' },
      {
        header: 'Amount',
        value: (r) => (r.reversesExpenseId ? r.amount : -r.amount),
        numFmt: '#,##0;[Red]-#,##0',
        align: 'right',
        total: true,
      },
      { header: 'Currency', value: (r) => r.currency, width: 10, align: 'center' },
      {
        header: 'Status',
        value: (r) =>
          r.reversesExpenseId
            ? 'Reversal'
            : r.isReversed
              ? 'Reversed'
              : r.status.replaceAll('_', ' '),
        width: 15,
      },
      {
        header: 'Recorded',
        value: (r) => (r.createdAt ? new Date(r.createdAt) : null),
        width: 13,
        numFmt: 'dd mmm yyyy',
      },
      { header: 'Description', value: (r) => r.description ?? '' },
    ],
  };
}
