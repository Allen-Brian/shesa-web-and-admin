import type { ExportSpec } from '@/lib/export/workbook';

import type { ChargeDetailMatrixProps, MatrixMember, PoolPayment } from './charge-detail-types';
import { formatPeriodHeader, slugify } from './shared-formatters';

/**
 * Formatted-workbook shapes for the two tables on a charge's detail
 * page. Both sat on the CSV helper, which cannot carry a header, a
 * number format or a column width — and these are exactly the two
 * sheets most likely to be forwarded to somebody outside finance.
 */

/** A matrix row flattened into the per-member totals the sheet needs. */
interface MatrixExportRow {
  readonly serial: number;
  readonly fullName: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly batchName: string | null;
  readonly memberCode: string | null;
  readonly isScopeBody: boolean;
  readonly paidByPeriod: readonly (number | null)[];
  readonly owedByPeriod: readonly (number | null)[];
  readonly totalPaid: number;
  readonly totalOwed: number;
  readonly outstanding: number;
  readonly coverage: number;
}

/**
 * The collection matrix — one row per member (or per scope body), one
 * Paid and one Owed column per period, then the roll-ups.
 *
 * Upcoming periods are dropped. They hold no payment data by
 * definition, and a run of empty columns at the right of a sheet reads
 * as missing data rather than as a period that has not happened yet.
 */
export function buildChargeMatrixExport(
  props: Pick<ChargeDetailMatrixProps, 'summary' | 'periods' | 'members'>,
): ExportSpec<MatrixExportRow> {
  const { summary, periods, members } = props;
  const activePeriods = periods.filter((p) => !p.isUpcoming);
  // Cells are stored against every period, upcoming ones included, so
  // the nth column of the sheet has to be mapped back to its slot in
  // the full list. Computed once rather than rescanned per cell.
  const cellIndexes = periods
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => !p.isUpcoming)
    .map(({ i }) => i);
  const rows = members.map((m, i) => flattenMember(m, periods, i + 1));

  return {
    filename: `${slugify(summary.name)}-collection`,
    title: `${summary.name} — collection`,
    subtitle: `${summary.scopeName} · ${activePeriods.length} period${activePeriods.length === 1 ? '' : 's'} · amounts in ${summary.currency}`,
    meta: [
      { label: 'Shape', value: summary.shape },
      { label: 'Recurrence', value: summary.recurrence.replaceAll('_', ' ') },
    ],
    sheetName: 'Collection',
    orientation: 'landscape',
    rows,
    columns: [
      { header: '#', value: (r) => r.serial, width: 6, align: 'center' },
      { header: 'Member', value: (r) => r.fullName, width: 28 },
      { header: 'Email', value: (r) => r.email ?? '' },
      { header: 'Phone', value: (r) => r.phone ?? '' },
      { header: 'Batch', value: (r) => r.batchName ?? '' },
      { header: 'Member code', value: (r) => r.memberCode ?? '', width: 14 },
      ...activePeriods.map((p, idx) => ({
        header: `${formatPeriodHeader(p)} Paid`,
        value: (r: MatrixExportRow) => r.paidByPeriod[cellIndexes[idx]!] ?? '',
        numFmt: '#,##0',
        align: 'right' as const,
        width: 13,
      })),
      ...activePeriods.map((p, idx) => ({
        header: `${formatPeriodHeader(p)} Owed`,
        value: (r: MatrixExportRow) => r.owedByPeriod[cellIndexes[idx]!] ?? '',
        numFmt: '#,##0',
        align: 'right' as const,
        width: 13,
      })),
      {
        header: 'Total paid',
        value: (r) => r.totalPaid,
        numFmt: '#,##0',
        align: 'right',
        width: 14,
        total: true,
      },
      {
        header: 'Total owed',
        value: (r) => r.totalOwed,
        numFmt: '#,##0',
        align: 'right',
        width: 14,
        total: true,
      },
      {
        header: 'Outstanding',
        value: (r) => r.outstanding,
        numFmt: '#,##0',
        align: 'right',
        width: 14,
        total: true,
      },
      {
        header: 'Coverage',
        value: (r) => r.coverage,
        numFmt: '0.0%',
        align: 'right',
        width: 11,
      },
      { header: 'Currency', value: () => summary.currency, width: 10, align: 'center' },
    ],
  };
}

function flattenMember(
  member: MatrixMember,
  periods: ChargeDetailMatrixProps['periods'],
  serial: number,
): MatrixExportRow {
  const paidByPeriod: (number | null)[] = [];
  const owedByPeriod: (number | null)[] = [];
  let totalPaid = 0;
  let totalOwed = 0;

  periods.forEach((p, idx) => {
    const cell = p.isUpcoming ? null : member.cells[idx];
    paidByPeriod[idx] = cell ? cell.paid : null;
    owedByPeriod[idx] = cell ? cell.owed : null;
    if (cell) {
      totalPaid += cell.paid;
      totalOwed += cell.owed;
    }
  });

  return {
    serial,
    fullName: member.fullName,
    email: member.email ?? null,
    phone: member.phone ?? null,
    batchName: member.batchName ?? null,
    memberCode: member.memberCode ?? null,
    isScopeBody: !!member.isScopeBody,
    paidByPeriod,
    owedByPeriod,
    totalPaid,
    totalOwed,
    outstanding: Math.max(0, totalOwed - totalPaid),
    // A member who owes nothing is fully covered, not divided by zero.
    coverage: totalOwed > 0 ? totalPaid / totalOwed : 1,
  };
}

/** The payment log on a pool-shaped charge — one row per payment. */
export function buildChargePoolExport(
  summary: { name: string; scopeName: string; currency: string; shape: string },
  payments: readonly PoolPayment[],
  formatMethodLabel: (method: string) => string,
): ExportSpec<PoolPayment> {
  return {
    filename: `${slugify(summary.name)}-payments`,
    title: `${summary.name} — payments`,
    subtitle: `${summary.scopeName} · every payment recorded against this ${summary.shape} charge`,
    sheetName: 'Payments',
    orientation: 'landscape',
    rows: payments,
    columns: [
      {
        header: 'Date',
        value: (p) => (p.createdAt ? new Date(p.createdAt) : null),
        width: 13,
        numFmt: 'dd mmm yyyy',
      },
      {
        header: 'Time',
        value: (p) =>
          p.createdAt
            ? new Date(p.createdAt).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '',
        width: 8,
        align: 'center',
      },
      { header: 'Payer', value: (p) => p.payerLabel },
      { header: 'Email', value: (p) => p.payerEmail ?? '' },
      { header: 'Phone', value: (p) => p.payerPhone ?? '' },
      { header: 'Batch', value: (p) => p.payerBatch ?? '' },
      { header: 'Member code', value: (p) => p.payerMemberCode ?? '', width: 14 },
      // Attire orders only. Kept unconditionally so the tailor's copy
      // of the sheet always has the column, even if a handful of early
      // orders have yet to be backfilled.
      { header: 'Size', value: (p) => p.attireSize ?? '', width: 8, align: 'center' },
      { header: 'Qty', value: (p) => p.quantity ?? '', width: 7, align: 'right', total: true },
      {
        header: 'Amount',
        // A reversal is money going back out, and the column has to
        // total to what the charge actually holds.
        value: (p) => (p.isReversal ? -p.amount : p.amount),
        numFmt: '#,##0;[Red]-#,##0',
        align: 'right',
        total: true,
      },
      { header: 'Currency', value: (p) => p.currency, width: 10, align: 'center' },
      { header: 'Method', value: (p) => formatMethodLabel(p.method) },
      {
        header: 'Source',
        value: (p) => (p.source === 'auto' ? 'Website' : 'Manual'),
        width: 10,
      },
      {
        header: 'State',
        value: (p) => (p.isReversal ? 'Reversal' : p.isReversedOriginal ? 'Reversed' : 'Cleared'),
        width: 11,
      },
      {
        header: 'Reconciled',
        value: (p) => (p.reconciled ? 'Yes' : 'No'),
        width: 12,
        align: 'center',
      },
      { header: 'Receipt no.', value: (p) => p.receiptNumber ?? '' },
      { header: 'External ref', value: (p) => p.externalRef ?? '' },
      { header: 'Note', value: (p) => p.memo ?? '' },
    ],
  };
}
