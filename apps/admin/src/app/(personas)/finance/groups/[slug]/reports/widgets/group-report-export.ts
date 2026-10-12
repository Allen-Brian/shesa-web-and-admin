import type { ExportSpec } from '@/lib/export/workbook';

import type { GroupInsights, GroupReportData } from './group-report-types';

/**
 * Workbook for an event group's report.
 *
 * One row per day rather than one per payment. The transactions list
 * is already exportable from this group's Transactions tab; what this
 * sheet is for is the shape of the thing — what came in, what went
 * out, and where the running total stood at the end of each day — so
 * that a treasurer can chart it themselves or paste it into minutes.
 *
 * The summary figures ride on the letterhead rather than in a column,
 * because they describe the whole sheet and would otherwise be
 * repeated on every row.
 */
export function buildGroupReportExport(
  data: GroupReportData,
  insights: GroupInsights,
): ExportSpec<GroupInsights['series'][number]> {
  const money = (v: number) => `${Math.round(v).toLocaleString()} ${data.currency}`;

  return {
    filename: `${data.slug}-report`,
    title: `${data.name} — report`,
    subtitle: 'Day-by-day money in and out, with running totals',
    meta: [
      { label: 'Raised', value: money(insights.income) },
      { label: 'Spent', value: money(insights.expenses) },
      { label: 'Net', value: money(insights.net) },
      { label: 'Payments', value: insights.paymentCount.toLocaleString() },
      { label: 'Contributors', value: insights.payerCount.toLocaleString() },
      {
        label: 'Reconciled',
        value: `${Math.round(insights.reconciledShare * 100)}% of money in`,
      },
    ],
    sheetName: 'Group report',
    rows: insights.series,
    columns: [
      {
        header: 'Date',
        value: (r) => new Date(`${r.date}T00:00:00`),
        width: 13,
        numFmt: 'dd mmm yyyy',
      },
      {
        header: 'Money in',
        value: (r) => r.income,
        numFmt: '#,##0',
        align: 'right',
        total: true,
      },
      {
        header: 'Money out',
        value: (r) => r.expense,
        numFmt: '#,##0',
        align: 'right',
        total: true,
      },
      {
        header: 'Net for the day',
        value: (r) => r.income - r.expense,
        numFmt: '#,##0;[Red]-#,##0',
        width: 15,
        align: 'right',
        total: true,
      },
      // Running totals must not be summed — the last row already is
      // the total, and a totals cell under it would double it.
      {
        header: 'Raised to date',
        value: (r) => r.cumulativeIncome,
        numFmt: '#,##0',
        width: 15,
        align: 'right',
      },
      {
        header: 'Net to date',
        value: (r) => r.cumulativeNet,
        numFmt: '#,##0;[Red]-#,##0',
        width: 15,
        align: 'right',
      },
    ],
  };
}
