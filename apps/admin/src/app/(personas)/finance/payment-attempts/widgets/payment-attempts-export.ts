import { formatPaymentMethod } from '@/lib/format/payment-method';
import type { ExportSpec } from '@/lib/export/workbook';

import type { SerialPaymentAttemptRow } from './payment-attempt-types';

/**
 * Workbook shape for Payment attempts.
 *
 * Nothing totals here on purpose. An attempt is not money — summing a
 * column of amounts most of which never settled would produce a figure
 * that looks like revenue and is not. The failure reason is carried
 * instead, because the reason this sheet gets exported is to work
 * through what went wrong.
 */
export function buildPaymentAttemptsExport(
  rows: readonly SerialPaymentAttemptRow[],
  meta: readonly { label: string; value: string }[],
): ExportSpec<SerialPaymentAttemptRow> {
  return {
    filename: 'payment-attempts',
    title: 'Payment attempts',
    subtitle: 'Gateway intents — what was tried, what settled, what failed',
    meta,
    sheetName: 'Attempts',
    orientation: 'landscape',
    rows,
    columns: [
      { header: '#', value: (r) => r.serial, width: 6, align: 'center' },
      {
        header: 'Started',
        value: (r) => (r.createdAt ? new Date(r.createdAt) : null),
        width: 16,
        numFmt: 'dd mmm yyyy hh:mm',
      },
      { header: 'Status', value: (r) => r.status, width: 11 },
      { header: 'Mode', value: (r) => r.mode, width: 9, align: 'center' },
      { header: 'Payer', value: (r) => r.payerLabel },
      { header: 'Payer type', value: (r) => (r.isMember ? 'Member' : 'Public'), width: 12 },
      { header: 'Email', value: (r) => r.payerEmail ?? '' },
      { header: 'Phone', value: (r) => r.payerPhone ?? '' },
      { header: 'Paid for', value: (r) => r.chargeName },
      { header: 'Scope', value: (r) => r.scopeName },
      { header: 'Amount', value: (r) => r.amount, numFmt: '#,##0', align: 'right' },
      { header: 'Currency', value: (r) => r.currency, width: 10, align: 'center' },
      { header: 'Qty', value: (r) => r.quantity ?? '', width: 7, align: 'right' },
      { header: 'Method', value: (r) => (r.method ? formatPaymentMethod(r.method) : '') },
      { header: 'Provider', value: (r) => r.provider ?? '', width: 12 },
      { header: 'Gateway ref', value: (r) => r.gatewayRef ?? '' },
      { header: 'Failure reason', value: (r) => r.failureReason ?? '' },
      { header: 'Note', value: (r) => r.note ?? '' },
      {
        header: 'Last update',
        value: (r) => (r.updatedAt ? new Date(r.updatedAt) : null),
        width: 16,
        numFmt: 'dd mmm yyyy hh:mm',
      },
    ],
  };
}
