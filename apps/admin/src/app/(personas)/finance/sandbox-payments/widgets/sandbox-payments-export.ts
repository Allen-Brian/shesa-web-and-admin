import { formatPaymentMethod } from '@/lib/format/payment-method';
import type { ExportSpec } from '@/lib/export/workbook';

import type { SerialSandboxPaymentRow } from './sandbox-payment-types';

/**
 * Workbook shape for sandbox settlements.
 *
 * The title says "test" and the subtitle repeats it, because this sheet
 * looks exactly like the Transactions export once it is out of the app
 * and none of these figures are real money. Gross, fee and net stay in
 * separate columns, and the match flag is spelled out in words rather
 * than left as a boolean — a run that clears at gross but nets short is
 * the thing this table exists to catch.
 */
export function buildSandboxPaymentsExport(
  rows: readonly SerialSandboxPaymentRow[],
  meta: readonly { label: string; value: string }[],
): ExportSpec<SerialSandboxPaymentRow> {
  return {
    filename: 'sandbox-settlements',
    title: 'Sandbox settlements (test data)',
    subtitle: 'Tranzak sandbox runs — not part of the books, not real money',
    meta,
    sheetName: 'Sandbox',
    orientation: 'landscape',
    rows,
    columns: [
      { header: '#', value: (r) => r.serial, width: 6, align: 'center' },
      {
        header: 'Settled',
        value: (r) => (r.createdAt ? new Date(r.createdAt) : null),
        width: 16,
        numFmt: 'dd mmm yyyy hh:mm',
      },
      { header: 'Payer', value: (r) => r.payerLabel },
      { header: 'Email', value: (r) => r.payerEmail ?? '' },
      { header: 'Phone', value: (r) => r.payerPhone ?? '' },
      { header: 'Paid for', value: (r) => r.chargeName },
      { header: 'Scope', value: (r) => r.scopeName },
      { header: 'Requested', value: (r) => r.amount, numFmt: '#,##0', align: 'right' },
      { header: 'Currency', value: (r) => r.currency, width: 10, align: 'center' },
      { header: 'Method', value: (r) => formatPaymentMethod(r.method) },
      {
        header: 'Gateway gross',
        value: (r) => r.gatewayAmount ?? '',
        numFmt: '#,##0',
        align: 'right',
      },
      { header: 'Gateway fee', value: (r) => r.gatewayFee ?? '', numFmt: '#,##0', align: 'right' },
      {
        header: 'Gateway net',
        value: (r) => r.gatewayNetAmount ?? '',
        numFmt: '#,##0',
        align: 'right',
      },
      {
        header: 'Matches request',
        value: (r) => (r.reconciles ? 'Yes' : 'No — check gross/currency'),
        width: 22,
      },
      { header: 'Provider', value: (r) => r.provider, width: 12 },
      { header: 'Provider status', value: (r) => r.providerStatus ?? '' },
      { header: 'Provider ref', value: (r) => r.providerRef ?? '' },
      { header: 'Transaction id', value: (r) => r.providerTransactionId ?? '' },
    ],
  };
}
