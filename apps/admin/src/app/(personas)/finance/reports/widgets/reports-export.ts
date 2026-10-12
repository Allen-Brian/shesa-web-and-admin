import type { ExportColumn, ExportSpec } from '@/lib/export/workbook';

import { formatMethod } from './reports-formatters';
import { REPORTS, type ResultRow, type RunResult } from './reports-types';

/**
 * Turns a finished report run into a formatted workbook.
 *
 * The RPCs return numeric columns as strings in places (Postgres
 * `numeric` arrives over PostgREST as text), and a string in a money
 * cell defeats both the number format and the totals row. Everything
 * numeric therefore goes through `num` on the way out rather than being
 * passed along as-is.
 *
 * Which columns total is a per-report judgement, not a rule. Summing a
 * treasury statement's opening and closing balances would produce two
 * meaningless figures, so that report totals nothing; a collections run
 * totals both its count and its money, because that is the number the
 * report was run to find.
 */
export function buildReportExport(result: RunResult): ExportSpec<ResultRow> {
  const entry = REPORTS.find((r) => r.value === result.report);
  return {
    filename: result.report.replaceAll('_', '-'),
    title: entry?.label ?? result.report,
    subtitle: [result.scopeName, result.groupName, result.windowLabel]
      .filter(Boolean)
      .join('  ·  '),
    meta: [{ label: 'Report', value: entry?.description ?? result.report }],
    sheetName: entry?.label ?? 'Report',
    rows: result.rows,
    columns: columnsFor(result.report),
  };
}

/** PostgREST hands `numeric` back as a string; Excel needs a number. */
function num(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/** Reads a field off the tagged-union row without narrowing per variant. */
function field(row: ResultRow, key: string): unknown {
  return (row as unknown as Record<string, unknown>)[key];
}

const MONEY = '#,##0';

function columnsFor(report: RunResult['report']): ExportColumn<ResultRow>[] {
  switch (report) {
    case 'collections':
      return [
        { header: 'Charge', value: (r) => String(field(r, 'charge_name') ?? '') },
        { header: 'Shape', value: (r) => String(field(r, 'shape') ?? ''), width: 13 },
        {
          header: 'Payments',
          value: (r) => num(field(r, 'payment_count')),
          width: 11,
          align: 'right',
          total: true,
        },
        {
          header: 'Total collected',
          value: (r) => num(field(r, 'total_collected')),
          numFmt: MONEY,
          align: 'right',
          total: true,
        },
      ];
    case 'arrears':
      return [
        { header: 'Member', value: (r) => String(field(r, 'member_name') ?? '') },
        { header: 'Email', value: (r) => String(field(r, 'member_email') ?? '') },
        { header: 'Phone', value: (r) => String(field(r, 'member_phone') ?? '') },
        { header: 'Batch', value: (r) => String(field(r, 'member_batch') ?? '') },
        { header: 'Member code', value: (r) => String(field(r, 'member_code') ?? ''), width: 14 },
        { header: 'Charge', value: (r) => String(field(r, 'charge_name') ?? '') },
        {
          header: 'Period',
          value: (r) => {
            const v = field(r, 'period_start');
            return v ? new Date(String(v)) : null;
          },
          width: 13,
          numFmt: 'dd mmm yyyy',
        },
        {
          header: 'Owed',
          value: (r) => num(field(r, 'amount_owed')),
          numFmt: MONEY,
          align: 'right',
          total: true,
        },
        {
          header: 'Paid',
          value: (r) => num(field(r, 'amount_paid')),
          numFmt: MONEY,
          align: 'right',
          total: true,
        },
        {
          header: 'Arrears',
          value: (r) => num(field(r, 'arrears')),
          numFmt: MONEY,
          align: 'right',
          total: true,
        },
      ];
    case 'treasury_statement':
      // Nothing totals: a column of opening balances has no meaningful
      // sum, and writing one would invite it to be read as a figure.
      return [
        { header: 'Currency', value: (r) => String(field(r, 'currency') ?? ''), width: 10 },
        {
          header: 'Opening balance',
          value: (r) => num(field(r, 'opening_balance')),
          numFmt: MONEY,
          align: 'right',
        },
        {
          header: 'Income',
          value: (r) => num(field(r, 'income_sum')),
          numFmt: MONEY,
          align: 'right',
        },
        {
          header: 'Expenses',
          value: (r) => num(field(r, 'expense_sum')),
          numFmt: MONEY,
          align: 'right',
        },
        {
          header: 'Closing balance',
          value: (r) => num(field(r, 'closing_balance')),
          numFmt: MONEY,
          align: 'right',
        },
      ];
    case 'payment_method_breakdown':
      return [
        { header: 'Method', value: (r) => formatMethod(String(field(r, 'method') ?? '')) },
        {
          header: 'Payments',
          value: (r) => num(field(r, 'payment_count')),
          width: 11,
          align: 'right',
          total: true,
        },
        {
          header: 'Total',
          value: (r) => num(field(r, 'total_amount')),
          numFmt: MONEY,
          align: 'right',
          total: true,
        },
      ];
    case 'expense_report_by_category':
      return [
        {
          header: 'Category',
          value: (r) => String(field(r, 'category_name') ?? '(uncategorised)'),
        },
        {
          header: 'Expenses',
          value: (r) => num(field(r, 'expense_count')),
          width: 11,
          align: 'right',
          total: true,
        },
        {
          header: 'Total',
          value: (r) => num(field(r, 'total_amount')),
          numFmt: MONEY,
          align: 'right',
          total: true,
        },
      ];
    case 'donation_report':
      return [
        { header: 'Campaign', value: (r) => String(field(r, 'charge_name') ?? '') },
        {
          header: 'Donations',
          value: (r) => num(field(r, 'donation_count')),
          width: 11,
          align: 'right',
          total: true,
        },
        {
          header: 'Named donors',
          value: (r) => num(field(r, 'named_donor_count')),
          width: 13,
          align: 'right',
          total: true,
        },
        {
          header: 'Anonymous',
          value: (r) => num(field(r, 'anonymous_count')),
          width: 12,
          align: 'right',
          total: true,
        },
        {
          header: 'Total donated',
          value: (r) => num(field(r, 'total_donated')),
          numFmt: MONEY,
          align: 'right',
          total: true,
        },
      ];
  }
}
