import type { ExportSpec } from '@/lib/export/workbook';

import { formatMethod } from './transactions-helpers';
import type { SerialRow } from './transactions-types';

/**
 * Workbook shape for the Transactions table.
 *
 * Carries more columns than the on-screen table does — payer contact,
 * the memo, the external and receipt references — because the sheet is
 * usually being sent to someone who cannot click a row open to find
 * them. The settlement word and the reconciliation flag stay in two
 * separate columns here, unlike the table's single chip: a spreadsheet
 * is filtered and pivoted on, and that needs each fact in its own
 * field.
 */
export function buildTransactionsExport(
  rows: readonly SerialRow[],
  reversedIds: ReadonlySet<string>,
  meta: readonly { label: string; value: string }[],
): ExportSpec<SerialRow> {
  return {
    filename: 'transactions',
    title: 'Transactions',
    subtitle: 'Every payment recorded across the scopes you can see',
    meta,
    sheetName: 'Transactions',
    orientation: 'landscape',
    rows,
    columns: [
      { header: 'S/N', value: (r) => r.serial, width: 7, align: 'center' },
      {
        header: 'Date',
        value: (r) => (r.createdAt ? new Date(r.createdAt) : null),
        width: 12,
        numFmt: 'dd mmm yyyy',
      },
      {
        header: 'Time',
        value: (r) =>
          r.createdAt
            ? new Date(r.createdAt).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '',
        width: 8,
        align: 'center',
      },
      { header: 'Payer', value: (r) => r.payerLabel },
      { header: 'Email', value: (r) => r.payerEmail ?? '' },
      { header: 'Phone', value: (r) => r.payerPhone ?? '' },
      { header: 'Batch', value: (r) => r.payerBatch ?? '' },
      { header: 'Member code', value: (r) => r.payerMemberCode ?? '', width: 14 },
      { header: 'Location', value: (r) => r.payerLocation ?? '' },
      { header: 'Paid for', value: (r) => r.chargeName },
      { header: 'Scope', value: (r) => r.scopeName },
      {
        header: 'Amount',
        value: (r) => r.amount,
        numFmt: '#,##0',
        align: 'right',
        total: true,
      },
      { header: 'Currency', value: (r) => r.currency, width: 10, align: 'center' },
      { header: 'Method', value: (r) => formatMethod(r.method) },
      {
        header: 'Source',
        value: (r) => (r.source === 'auto' ? 'Website' : 'Manual'),
        width: 10,
      },
      {
        header: 'State',
        value: (r) =>
          r.reversesPaymentId ? 'Reversal' : reversedIds.has(r.id) ? 'Reversed' : 'Cleared',
        width: 11,
      },
      {
        header: 'Reconciled',
        value: (r) => (r.reconciled ? 'Yes' : 'No'),
        width: 12,
        align: 'center',
      },
      {
        header: 'Reconciled on',
        value: (r) => (r.reconciledAt ? new Date(r.reconciledAt) : null),
        width: 14,
        numFmt: 'dd mmm yyyy',
      },
      { header: 'Receipt no.', value: (r) => r.receiptNumber ?? '' },
      { header: 'External ref', value: (r) => r.externalRef ?? '' },
      { header: 'Note', value: (r) => r.memo ?? '' },
    ],
  };
}
