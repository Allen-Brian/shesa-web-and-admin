import type { ColDef, ICellRendererParams } from '@shesa/ui';

import type { ReportKey } from '../report-actions';
import { formatMethod } from './reports-formatters';
import type { ResultRow } from './reports-types';

const fmtMoney = (v: unknown): string => {
  const n = typeof v === 'string' ? parseFloat(v) : ((v as number) ?? 0);
  return new Intl.NumberFormat().format(Math.round(Number(n) * 100) / 100);
};

const fmtInt = (v: unknown): string => {
  const n = typeof v === 'string' ? parseInt(v, 10) : ((v as number) ?? 0);
  return new Intl.NumberFormat().format(Number(n));
};

const moneyCell =
  (className = 'text-sm text-foreground tabular-nums') =>
  (p: ICellRendererParams<ResultRow>) => <span className={className}>{fmtMoney(p.value)}</span>;

/**
 * Column defs per report, dispatched by `report`. Kept in one file
 * rather than six because the shapes are small and reading them
 * side-by-side helps keep formatting decisions consistent (money
 * cells all use `tabular-nums`, integer counts all use `fmtInt`, etc.).
 */
export function buildReportColumns(report: ReportKey): ColDef<ResultRow>[] {
  switch (report) {
    case 'collections':
      return [
        { headerName: 'Charge', field: 'charge_name' as never, flex: 2, minWidth: 200 },
        { headerName: 'Shape', field: 'shape' as never, width: 130 },
        {
          headerName: 'Payments',
          field: 'payment_count' as never,
          width: 120,
          valueFormatter: (p) => fmtInt(p.value),
        },
        {
          headerName: 'Total',
          field: 'total_collected' as never,
          flex: 1,
          minWidth: 160,
          cellRenderer: moneyCell(),
        },
      ];
    case 'arrears':
      return [
        { headerName: 'Member', field: 'member_name' as never, flex: 2, minWidth: 180 },
        { headerName: 'Charge', field: 'charge_name' as never, flex: 1.5, minWidth: 160 },
        {
          headerName: 'Period',
          field: 'period_start' as never,
          width: 140,
          valueFormatter: (p) => (p.value ? new Date(p.value as string).toLocaleDateString() : '—'),
        },
        {
          headerName: 'Owed',
          field: 'amount_owed' as never,
          width: 140,
          valueFormatter: (p) => fmtMoney(p.value),
        },
        {
          headerName: 'Paid',
          field: 'amount_paid' as never,
          width: 140,
          valueFormatter: (p) => fmtMoney(p.value),
        },
        {
          headerName: 'Arrears',
          field: 'arrears' as never,
          width: 140,
          cellRenderer: moneyCell('text-sm font-medium text-destructive tabular-nums'),
        },
      ];
    case 'treasury_statement':
      return [
        { headerName: 'Currency', field: 'currency' as never, width: 100 },
        {
          headerName: 'Opening',
          field: 'opening_balance' as never,
          flex: 1,
          minWidth: 140,
          valueFormatter: (p) => fmtMoney(p.value),
        },
        {
          headerName: 'Income',
          field: 'income_sum' as never,
          flex: 1,
          minWidth: 140,
          cellRenderer: (p: ICellRendererParams<ResultRow>) => (
            <span className="text-sm text-emerald-700 dark:text-emerald-400 tabular-nums">
              +{fmtMoney(p.value)}
            </span>
          ),
        },
        {
          headerName: 'Expense',
          field: 'expense_sum' as never,
          flex: 1,
          minWidth: 140,
          cellRenderer: (p: ICellRendererParams<ResultRow>) => (
            <span className="text-sm text-amber-700 dark:text-amber-400 tabular-nums">
              −{fmtMoney(p.value)}
            </span>
          ),
        },
        {
          headerName: 'Closing',
          field: 'closing_balance' as never,
          flex: 1.2,
          minWidth: 160,
          cellRenderer: moneyCell('text-base font-semibold text-foreground tabular-nums'),
        },
      ];
    case 'payment_method_breakdown':
      return [
        {
          headerName: 'Method',
          field: 'method' as never,
          flex: 1.5,
          minWidth: 160,
          valueFormatter: (p) => formatMethod(String(p.value ?? '')),
        },
        {
          headerName: 'Payments',
          field: 'payment_count' as never,
          width: 130,
          valueFormatter: (p) => fmtInt(p.value),
        },
        {
          headerName: 'Total',
          field: 'total_amount' as never,
          flex: 1,
          minWidth: 160,
          cellRenderer: moneyCell(),
        },
      ];
    case 'expense_report_by_category':
      return [
        {
          headerName: 'Category',
          field: 'category_name' as never,
          flex: 2,
          minWidth: 180,
          valueFormatter: (p) => (p.value as string) ?? '(uncategorized)',
        },
        {
          headerName: 'Expenses',
          field: 'expense_count' as never,
          width: 130,
          valueFormatter: (p) => fmtInt(p.value),
        },
        {
          headerName: 'Total',
          field: 'total_amount' as never,
          flex: 1,
          minWidth: 160,
          cellRenderer: moneyCell(),
        },
      ];
    case 'donation_report':
      return [
        { headerName: 'Campaign', field: 'charge_name' as never, flex: 2, minWidth: 200 },
        {
          headerName: 'Donations',
          field: 'donation_count' as never,
          width: 130,
          valueFormatter: (p) => fmtInt(p.value),
        },
        {
          headerName: 'Named',
          field: 'named_donor_count' as never,
          width: 120,
          valueFormatter: (p) => fmtInt(p.value),
        },
        {
          headerName: 'Anonymous',
          field: 'anonymous_count' as never,
          width: 130,
          valueFormatter: (p) => fmtInt(p.value),
        },
        {
          headerName: 'Total',
          field: 'total_donated' as never,
          flex: 1,
          minWidth: 160,
          cellRenderer: moneyCell(),
        },
      ];
  }
}
