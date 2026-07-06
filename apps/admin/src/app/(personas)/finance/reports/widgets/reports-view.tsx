'use client';

import { useMemo, useState, useTransition } from 'react';
import { BarChart3, Play } from 'lucide-react';

import {
  Button,
  DataTable,
  Label,
  NativeDateInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  type ColDef,
  type ICellRendererParams,
} from '@shesa/ui';

import {
  runReport,
  type ArrearsRow,
  type CollectionsRow,
  type DonationReportRow,
  type ExpenseByCategoryRow,
  type PaymentMethodRow,
  type ReportKey,
  type TreasuryStatementRow,
} from '../actions';

export interface ScopeOption {
  readonly id: string;
  readonly name: string;
  readonly currency: string;
}

interface ReportsViewProps {
  readonly scopeOptions: readonly ScopeOption[];
}

const REPORTS: readonly {
  value: ReportKey;
  label: string;
  description: string;
  usesDates: boolean;
}[] = [
  {
    value: 'collections',
    label: 'Collections',
    description: 'Money in over a period, grouped by charge.',
    usesDates: true,
  },
  {
    value: 'arrears',
    label: 'Arrears / Outstanding',
    description: 'Who owes — open + partial obligations per member.',
    usesDates: false,
  },
  {
    value: 'treasury_statement',
    label: 'Treasury statement',
    description: 'Opening · income · expenses · closing.',
    usesDates: true,
  },
  {
    value: 'payment_method_breakdown',
    label: 'Payment method breakdown',
    description: 'How money arrived (cash / MoMo / Orange / …).',
    usesDates: true,
  },
  {
    value: 'expense_report_by_category',
    label: 'Expenses by category',
    description: 'Recorded + approved expenses grouped by category.',
    usesDates: true,
  },
  {
    value: 'donation_report',
    label: 'Donation report',
    description: 'Freewill income per campaign, named vs anonymous donor split.',
    usesDates: true,
  },
];

type ResultRow =
  | ({ __report: 'collections' } & CollectionsRow)
  | ({ __report: 'arrears' } & ArrearsRow)
  | ({ __report: 'treasury_statement' } & TreasuryStatementRow)
  | ({ __report: 'payment_method_breakdown' } & PaymentMethodRow)
  | ({ __report: 'expense_report_by_category' } & ExpenseByCategoryRow)
  | ({ __report: 'donation_report' } & DonationReportRow);

interface RunResult {
  readonly report: ReportKey;
  readonly rows: ResultRow[];
}

export function ReportsView({ scopeOptions }: ReportsViewProps) {
  const [pending, startTransition] = useTransition();
  const [reportKey, setReportKey] = useState<ReportKey>('collections');
  const [scopeId, setScopeId] = useState<string>(scopeOptions[0]?.id ?? '');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<RunResult | null>(null);

  const currentReport = useMemo(() => REPORTS.find((r) => r.value === reportKey), [reportKey]);
  const canRun = !!scopeId;

  const runNow = () => {
    if (!scopeId) {
      toast.error('Pick a scope.');
      return;
    }
    startTransition(async () => {
      const result = await runReport({
        reportKey,
        scopeId,
        from: currentReport?.usesDates && fromDate ? fromDate : null,
        to: currentReport?.usesDates && toDate ? toDate : null,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      // Tag each row with the report key so the polymorphic column
      // renderer can key off it.
      const tagged = result.data.rows.map((r) => ({
        ...(r as unknown as Record<string, unknown>),
        __report: result.data.report,
      })) as unknown as ResultRow[];
      setResult({ report: result.data.report, rows: tagged });
    });
  };

  const columnDefs = useMemo<ColDef<ResultRow>[]>(() => {
    if (!result) return [];
    return columnsFor(result.report);
  }, [result]);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BarChart3 className="h-6 w-6" />
          Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick a report + a scope + (for windowed reports) a date range, then run.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report">Report</Label>
            <Select value={reportKey} onValueChange={(v) => setReportKey(v as ReportKey)}>
              <SelectTrigger id="report">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORTS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentReport && (
              <span className="text-xs text-muted-foreground">{currentReport.description}</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scope">Scope</Label>
            <Select value={scopeId} onValueChange={setScopeId}>
              <SelectTrigger id="scope">
                <SelectValue placeholder="Pick a scope" />
              </SelectTrigger>
              <SelectContent>
                {scopeOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {currentReport?.usesDates && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="from">From (optional)</Label>
                <NativeDateInput id="from" value={fromDate} onChange={(v) => setFromDate(v)} />
                <span className="text-xs text-muted-foreground">
                  Leave empty for from-beginning.
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="to">To</Label>
                <NativeDateInput id="to" value={toDate} onChange={(v) => setToDate(v)} />
              </div>
            </>
          )}
        </div>
        <div className="mt-3 flex justify-end">
          <Button type="button" size="sm" onClick={runNow} disabled={!canRun || pending}>
            <Play className="h-4 w-4" />
            Run report
          </Button>
        </div>
      </div>

      {result ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {REPORTS.find((r) => r.value === result.report)?.label ?? result.report}
            </h2>
            <span className="text-xs text-muted-foreground">
              {result.rows.length} row{result.rows.length === 1 ? '' : 's'}
            </span>
          </div>
          {result.rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No rows in this window.
            </div>
          ) : (
            <DataTable<ResultRow>
              rowData={result.rows}
              columnDefs={columnDefs}
              showColumnPicker={false}
              selectable={false}
            />
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Pick parameters + click Run.
        </div>
      )}
    </section>
  );
}

// ─── Column defs per report ────────────────────────────────────────────

function columnsFor(report: ReportKey): ColDef<ResultRow>[] {
  const fmtMoney = (v: unknown, ccy?: string) => {
    const n = typeof v === 'string' ? parseFloat(v) : ((v as number) ?? 0);
    return `${new Intl.NumberFormat().format(Math.round(Number(n) * 100) / 100)}${ccy ? ` ${ccy}` : ''}`;
  };
  const fmtInt = (v: unknown) => {
    const n = typeof v === 'string' ? parseInt(v, 10) : ((v as number) ?? 0);
    return new Intl.NumberFormat().format(Number(n));
  };

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
          cellRenderer: (p: ICellRendererParams<ResultRow>) => (
            <span className="font-mono text-sm text-foreground">{fmtMoney(p.value)}</span>
          ),
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
          cellRenderer: (p: ICellRendererParams<ResultRow>) => (
            <span className="font-mono text-sm text-destructive">{fmtMoney(p.value)}</span>
          ),
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
            <span className="font-mono text-sm text-emerald-700 dark:text-emerald-400">
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
            <span className="font-mono text-sm text-amber-700 dark:text-amber-400">
              −{fmtMoney(p.value)}
            </span>
          ),
        },
        {
          headerName: 'Closing',
          field: 'closing_balance' as never,
          flex: 1.2,
          minWidth: 160,
          cellRenderer: (p: ICellRendererParams<ResultRow>) => (
            <span className="font-mono text-base font-semibold text-foreground">
              {fmtMoney(p.value)}
            </span>
          ),
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
          cellRenderer: (p: ICellRendererParams<ResultRow>) => (
            <span className="font-mono text-sm text-foreground">{fmtMoney(p.value)}</span>
          ),
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
          cellRenderer: (p: ICellRendererParams<ResultRow>) => (
            <span className="font-mono text-sm text-foreground">{fmtMoney(p.value)}</span>
          ),
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
          cellRenderer: (p: ICellRendererParams<ResultRow>) => (
            <span className="font-mono text-sm text-foreground">{fmtMoney(p.value)}</span>
          ),
        },
      ];
  }
}

function formatMethod(method: string): string {
  switch (method) {
    case 'cash':
      return 'Cash';
    case 'mtn_momo':
      return 'MTN MoMo';
    case 'orange_money':
      return 'Orange Money';
    case 'bank_transfer':
      return 'Bank transfer';
    case 'card':
      return 'Card';
    default:
      return method;
  }
}
