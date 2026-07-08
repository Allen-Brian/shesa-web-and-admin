'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  AlertCircle,
  BarChart3,
  CreditCard,
  Download,
  Gift,
  HandCoins,
  Play,
  Tag,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  Button,
  DataTable,
  GradientPanel,
  Label,
  NativeDateInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatsCard,
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

interface ReportCatalogueEntry {
  readonly value: ReportKey;
  readonly label: string;
  readonly description: string;
  readonly icon: typeof BarChart3;
  readonly usesDates: boolean;
  /** Tailwind class fragment used for the card's icon avatar. */
  readonly iconClass: string;
}

const REPORTS: readonly ReportCatalogueEntry[] = [
  {
    value: 'collections',
    label: 'Collections',
    description: 'Money in per charge over a period.',
    icon: HandCoins,
    usesDates: true,
    iconClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
  {
    value: 'arrears',
    label: 'Arrears',
    description: 'Who owes — open + partial obligations per member.',
    icon: AlertCircle,
    usesDates: false,
    iconClass: 'bg-destructive/10 text-destructive',
  },
  {
    value: 'treasury_statement',
    label: 'Treasury statement',
    description: 'Opening · income · expenses · closing.',
    icon: Wallet,
    usesDates: true,
    iconClass: 'bg-primary/10 text-primary',
  },
  {
    value: 'payment_method_breakdown',
    label: 'Payment methods',
    description: 'How money arrived (cash / MoMo / Orange / …).',
    icon: CreditCard,
    usesDates: true,
    iconClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  },
  {
    value: 'expense_report_by_category',
    label: 'Expenses by category',
    description: 'Recorded + approved expenses grouped by category.',
    icon: Tag,
    usesDates: true,
    iconClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  {
    value: 'donation_report',
    label: 'Donations',
    description: 'Freewill income per campaign, named vs anonymous split.',
    icon: Gift,
    usesDates: true,
    iconClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  },
];

// Preset windows the operator can pick with a single click. `Custom`
// keeps the date inputs visible so the operator can dial in an exact
// range without the presets getting in the way.
type Preset = '30d' | '90d' | 'mtd' | 'ytd' | 'all' | 'custom';

const PRESETS: readonly { key: Preset; label: string }[] = [
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'mtd', label: 'Month to date' },
  { key: 'ytd', label: 'Year to date' },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom' },
];

function windowFor(
  preset: Preset,
  customFrom: string,
  customTo: string,
): {
  from: string;
  to: string;
} {
  const to = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  switch (preset) {
    case '30d': {
      const from = new Date();
      from.setDate(from.getDate() - 30);
      return { from: iso(from), to: iso(to) };
    }
    case '90d': {
      const from = new Date();
      from.setDate(from.getDate() - 90);
      return { from: iso(from), to: iso(to) };
    }
    case 'mtd': {
      const from = new Date();
      from.setDate(1);
      return { from: iso(from), to: iso(to) };
    }
    case 'ytd': {
      const from = new Date();
      from.setMonth(0, 1);
      return { from: iso(from), to: iso(to) };
    }
    case 'all':
      return { from: '', to: iso(to) };
    case 'custom':
      return { from: customFrom, to: customTo || iso(to) };
  }
}

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
  readonly ranAt: string;
  readonly scopeName: string;
  readonly windowLabel: string;
}

const CHART_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#f97316', // orange
  '#64748b', // slate
];

export function ReportsView({ scopeOptions }: ReportsViewProps) {
  const [pending, startTransition] = useTransition();
  const [reportKey, setReportKey] = useState<ReportKey>('collections');
  const [scopeId, setScopeId] = useState<string>(scopeOptions[0]?.id ?? '');
  const [preset, setPreset] = useState<Preset>('30d');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<RunResult | null>(null);

  const currentReport = useMemo(() => REPORTS.find((r) => r.value === reportKey)!, [reportKey]);
  const currentScope = useMemo(
    () => scopeOptions.find((s) => s.id === scopeId),
    [scopeOptions, scopeId],
  );
  const canRun = !!scopeId;

  const runNow = () => {
    if (!scopeId) {
      toast.error('Pick a scope.');
      return;
    }
    const { from, to } = windowFor(preset, customFrom, customTo);
    startTransition(async () => {
      const res = await runReport({
        reportKey,
        scopeId,
        from: currentReport.usesDates && from ? from : null,
        to: currentReport.usesDates && to ? to : null,
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      const tagged = res.data.rows.map((r) => ({
        ...(r as unknown as Record<string, unknown>),
        __report: res.data.report,
      })) as unknown as ResultRow[];
      const windowLabel = currentReport.usesDates
        ? preset === 'custom'
          ? `${from || 'beginning'} → ${to}`
          : (PRESETS.find((p) => p.key === preset)?.label ?? preset)
        : 'point-in-time';
      setResult({
        report: res.data.report,
        rows: tagged,
        ranAt: new Date().toISOString(),
        scopeName: currentScope?.name ?? '',
        windowLabel,
      });
    });
  };

  const columnDefs = useMemo<ColDef<ResultRow>[]>(
    () => (result ? columnsFor(result.report) : []),
    [result],
  );

  const exportCsv = () => {
    if (!result || result.rows.length === 0) return;
    const cols = columnsFor(result.report);
    const header = cols.map((c) => c.headerName ?? String(c.colId ?? c.field ?? ''));
    const rows = result.rows.map((r) => {
      const rec = r as unknown as Record<string, unknown>;
      return cols.map((c) => {
        const field = (c.field ?? c.colId ?? '') as string;
        const v = rec[field];
        if (v === null || v === undefined) return '';
        if (typeof v === 'number') return String(v);
        return String(v);
      });
    });
    downloadCsv(`${result.report}-${new Date().toISOString().slice(0, 10)}`, [header, ...rows]);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BarChart3 className="h-6 w-6" />
          Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick a report and a scope. Windowed reports respect the date preset below.
        </p>
      </div>

      {/* Report catalogue — clickable card grid instead of a Select */}
      <div>
        <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Report
        </span>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map((r) => {
            const active = reportKey === r.value;
            const Icon = r.icon;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setReportKey(r.value)}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  active
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${r.iconClass}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">{r.label}</span>
                  <span className="text-xs text-muted-foreground">{r.description}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                    {r.usesDates ? 'Windowed' : 'Point-in-time'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scope + window controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

          {currentReport.usesDates && (
            <>
              <div className="flex flex-col gap-1.5 lg:col-span-2">
                <Label>Window</Label>
                <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-background p-0.5">
                  {PRESETS.map((p) => {
                    const active = preset === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setPreset(p.key)}
                        className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {currentReport.usesDates && preset === 'custom' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="from">From (optional)</Label>
              <NativeDateInput id="from" value={customFrom} onChange={setCustomFrom} />
              <span className="text-xs text-muted-foreground">Leave empty for from-beginning.</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="to">To</Label>
              <NativeDateInput id="to" value={customTo} onChange={setCustomTo} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <span className="text-xs text-muted-foreground">
            {currentScope ? currentScope.name : 'no scope'} ·{' '}
            {currentReport.usesDates
              ? preset === 'custom'
                ? `${customFrom || 'beginning'} → ${customTo}`
                : PRESETS.find((p) => p.key === preset)?.label
              : 'point-in-time'}
          </span>
          <Button
            type="button"
            size="sm"
            onClick={runNow}
            disabled={!canRun || pending}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            Run report
          </Button>
        </div>
      </div>

      {/* Result panel */}
      {result ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-lg font-semibold text-foreground">
                {REPORTS.find((r) => r.value === result.report)?.label ?? result.report}
              </h2>
              <span className="text-xs text-muted-foreground">
                {result.scopeName} · {result.windowLabel} · {result.rows.length} row
                {result.rows.length === 1 ? '' : 's'} · ran{' '}
                {new Date(result.ranAt).toLocaleTimeString()}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={result.rows.length === 0}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>

          {result.rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No rows for this window. Try a wider range or a different scope.
            </div>
          ) : (
            <>
              <ResultInsights result={result} scopeCurrency={currentScope?.currency ?? ''} />
              <DataTable<ResultRow>
                rowData={result.rows}
                columnDefs={columnDefs}
                showColumnPicker={false}
                selectable={false}
              />
            </>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <BarChart3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            Pick a report + scope above, then click <span className="font-medium">Run report</span>.
          </p>
        </div>
      )}
    </section>
  );
}

// ═══ Result insights (KPI strip + chart per report) ═════════════════

function ResultInsights({
  result,
  scopeCurrency,
}: {
  readonly result: RunResult;
  readonly scopeCurrency: string;
}) {
  const currency = scopeCurrency;

  if (result.report === 'collections') {
    const rows = result.rows as (CollectionsRow & { __report: 'collections' })[];
    const totalCollected = rows.reduce((a, b) => a + Number(b.total_collected ?? 0), 0);
    const totalPayments = rows.reduce((a, b) => a + Number(b.payment_count ?? 0), 0);
    const chartData = rows
      .slice()
      .sort((a, b) => Number(b.total_collected) - Number(a.total_collected))
      .slice(0, 8)
      .map((r) => ({ name: shorten(String(r.charge_name), 18), value: Number(r.total_collected) }));
    return (
      <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Charges collecting" value={rows.length.toLocaleString()} />
          <StatsCard label="Total collected" value={formatMoney(totalCollected, currency)} />
          <StatsCard label="Payments" value={totalPayments.toLocaleString()} />
          <StatsCard
            label="Avg per payment"
            value={totalPayments > 0 ? formatMoney(totalCollected / totalPayments, currency) : '—'}
          />
        </div>
        {chartData.length > 0 && (
          <BarChartPanel
            title="Top charges by amount collected"
            data={chartData}
            currency={currency}
          />
        )}
      </>
    );
  }

  if (result.report === 'arrears') {
    const rows = result.rows as (ArrearsRow & { __report: 'arrears' })[];
    const totalArrears = rows.reduce((a, b) => a + Number(b.arrears ?? 0), 0);
    const memberCount = new Set(rows.map((r) => r.member_name)).size;
    const topOffenders = rows
      .slice()
      .sort((a, b) => Number(b.arrears) - Number(a.arrears))
      .slice(0, 8)
      .map((r) => ({ name: shorten(String(r.member_name), 18), value: Number(r.arrears) }));
    return (
      <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Rows" value={rows.length.toLocaleString()} />
          <StatsCard label="Members behind" value={memberCount.toLocaleString()} />
          <StatsCard label="Total arrears" value={formatMoney(totalArrears, currency)} />
          <StatsCard
            label="Avg per row"
            value={rows.length > 0 ? formatMoney(totalArrears / rows.length, currency) : '—'}
          />
        </div>
        {topOffenders.length > 0 && (
          <BarChartPanel
            title="Largest outstanding balances"
            data={topOffenders}
            currency={currency}
            barFill="#f43f5e"
          />
        )}
      </>
    );
  }

  if (result.report === 'treasury_statement') {
    const rows = result.rows as (TreasuryStatementRow & { __report: 'treasury_statement' })[];
    const row = rows[0];
    if (!row) return null;
    const income = Number(row.income_sum ?? 0);
    const expenses = Number(row.expense_sum ?? 0);
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Opening" value={formatMoney(Number(row.opening_balance), currency)} />
        <StatsCard label="Income" value={`+${formatMoney(income, currency)}`} />
        <StatsCard label="Expenses" value={`−${formatMoney(expenses, currency)}`} />
        <StatsCard label="Closing" value={formatMoney(Number(row.closing_balance), currency)} />
      </div>
    );
  }

  if (result.report === 'payment_method_breakdown') {
    const rows = result.rows as (PaymentMethodRow & { __report: 'payment_method_breakdown' })[];
    const total = rows.reduce((a, b) => a + Number(b.total_amount ?? 0), 0);
    const top = rows.slice().sort((a, b) => Number(b.total_amount) - Number(a.total_amount))[0];
    const chartData = rows.map((r) => ({
      name: formatMethod(String(r.method)),
      value: Number(r.total_amount),
      count: Number(r.payment_count),
    }));
    return (
      <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Methods used" value={rows.length.toLocaleString()} />
          <StatsCard label="Total collected" value={formatMoney(total, currency)} />
          <StatsCard label="Top method" value={top ? formatMethod(String(top.method)) : '—'} />
          <StatsCard
            label="Top method share"
            value={
              top && total > 0 ? `${Math.round((Number(top.total_amount) / total) * 100)}%` : '—'
            }
          />
        </div>
        {chartData.length > 0 && (
          <DonutPanel title="Share of collections by method" data={chartData} currency={currency} />
        )}
      </>
    );
  }

  if (result.report === 'expense_report_by_category') {
    const rows = result.rows as (ExpenseByCategoryRow & {
      __report: 'expense_report_by_category';
    })[];
    const total = rows.reduce((a, b) => a + Number(b.total_amount ?? 0), 0);
    const totalExpenses = rows.reduce((a, b) => a + Number(b.expense_count ?? 0), 0);
    const chartData = rows.map((r) => ({
      name: String(r.category_name ?? '(uncategorized)'),
      value: Number(r.total_amount),
      count: Number(r.expense_count),
    }));
    return (
      <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Categories" value={rows.length.toLocaleString()} />
          <StatsCard label="Expenses" value={totalExpenses.toLocaleString()} />
          <StatsCard label="Total spent" value={formatMoney(total, currency)} />
          <StatsCard
            label="Avg per category"
            value={rows.length > 0 ? formatMoney(total / rows.length, currency) : '—'}
          />
        </div>
        {chartData.length > 0 && (
          <DonutPanel title="Share of spend by category" data={chartData} currency={currency} />
        )}
      </>
    );
  }

  if (result.report === 'donation_report') {
    const rows = result.rows as (DonationReportRow & { __report: 'donation_report' })[];
    const totalDonated = rows.reduce((a, b) => a + Number(b.total_donated ?? 0), 0);
    const named = rows.reduce((a, b) => a + Number(b.named_donor_count ?? 0), 0);
    const anonymous = rows.reduce((a, b) => a + Number(b.anonymous_count ?? 0), 0);
    const chartData = rows
      .slice()
      .sort((a, b) => Number(b.total_donated) - Number(a.total_donated))
      .slice(0, 8)
      .map((r) => ({ name: shorten(String(r.charge_name), 18), value: Number(r.total_donated) }));
    return (
      <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Campaigns" value={rows.length.toLocaleString()} />
          <StatsCard label="Total donated" value={formatMoney(totalDonated, currency)} />
          <StatsCard label="Named donors" value={named.toLocaleString()} />
          <StatsCard label="Anonymous" value={anonymous.toLocaleString()} />
        </div>
        {chartData.length > 0 && (
          <BarChartPanel
            title="Top campaigns by amount donated"
            data={chartData}
            currency={currency}
            barFill="#8b5cf6"
          />
        )}
      </>
    );
  }

  return null;
}

// ═══ Chart primitives ═══════════════════════════════════════════════

const AXIS_TICK = {
  fill: 'var(--color-muted-foreground)',
  fontSize: 11,
} as const;

const tooltipStyle: React.CSSProperties = {
  background: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--color-popover-foreground)',
};

function BarChartPanel({
  title,
  data,
  currency,
  barFill = '#3b82f6',
}: {
  readonly title: string;
  readonly data: readonly { name: string; value: number }[];
  readonly currency: string;
  readonly barFill?: string;
}) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <span className="text-sm font-medium text-foreground">{title}</span>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data as { name: string; value: number }[]}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => compactNumber(v as number)}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) =>
              typeof v === 'number' ? [formatMoney(v, currency), 'Amount'] : ['—', 'Amount']
            }
            cursor={{ fill: 'var(--color-muted)', opacity: 0.35 }}
          />
          <Bar dataKey="value" fill={barFill} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </GradientPanel>
  );
}

function DonutPanel({
  title,
  data,
  currency,
}: {
  readonly title: string;
  readonly data: readonly { name: string; value: number; count: number }[];
  readonly currency: string;
}) {
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <GradientPanel className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center">
      <div className="flex-1">
        <span className="mb-2 block text-sm font-medium text-foreground">{title}</span>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data as unknown as { name: string; value: number }[]}
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              stroke="var(--color-card)"
              strokeWidth={2}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v) => (typeof v === 'number' ? formatMoney(v, currency) : '—')}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col gap-1.5 text-xs lg:min-w-56">
        {data.map((d, idx) => {
          const pct = (d.value / total) * 100;
          return (
            <li key={d.name} className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: CHART_PALETTE[idx % CHART_PALETTE.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-foreground">{d.name}</span>
              <span className="text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
            </li>
          );
        })}
      </ul>
    </GradientPanel>
  );
}

// ═══ Column defs per report (unchanged behaviour) ═══════════════════

function columnsFor(report: ReportKey): ColDef<ResultRow>[] {
  const fmtMoney = (v: unknown) => {
    const n = typeof v === 'string' ? parseFloat(v) : ((v as number) ?? 0);
    return new Intl.NumberFormat().format(Math.round(Number(n) * 100) / 100);
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
            <span className="text-sm text-foreground tabular-nums">{fmtMoney(p.value)}</span>
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
            <span className="text-sm font-medium text-destructive tabular-nums">
              {fmtMoney(p.value)}
            </span>
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
          cellRenderer: (p: ICellRendererParams<ResultRow>) => (
            <span className="text-base font-semibold text-foreground tabular-nums">
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
            <span className="text-sm text-foreground tabular-nums">{fmtMoney(p.value)}</span>
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
            <span className="text-sm text-foreground tabular-nums">{fmtMoney(p.value)}</span>
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
            <span className="text-sm text-foreground tabular-nums">{fmtMoney(p.value)}</span>
          ),
        },
      ];
  }
}

// ═══ Helpers ════════════════════════════════════════════════════════

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

function formatMoney(amount: number, currency: string): string {
  return `${new Intl.NumberFormat().format(Math.round(amount))} ${currency}`.trim();
}

function compactNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

function shorten(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

// Simple CSV builder + download. Matches the escape rules used on the
// Charge Detail page so exports open cleanly in Excel + Sheets.
function downloadCsv(baseName: string, rows: readonly (readonly string[])[]): void {
  const escape = (v: string): string => {
    if (v.includes('"') || v.includes(',') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const csv = rows.map((r) => r.map(escape).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
