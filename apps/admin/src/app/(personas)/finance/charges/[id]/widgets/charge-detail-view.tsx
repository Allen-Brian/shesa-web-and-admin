'use client';

/**
 * ChargeDetailView — the "who has paid" drill-down for a single charge.
 *
 * Layout:
 *   • Hero: name, status, one-line meta, description.
 *   • Tab switcher:
 *       – Collection Table: member × period matrix (or flat payments
 *         list for pool shapes). Auto-adds the next few upcoming
 *         periods with an "Upcoming" pipeline state so admins can see
 *         what's coming without having to run the obligation
 *         generator first.
 *       – Reports: KPIs + charts + ranked tables. Charts use Recharts
 *         with theme-token fills so light + dark render cleanly.
 *
 * CSV export lives inside the Collection tab so operators can push
 * the raw matrix into Excel / Sheets.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeDollarSign,
  CircleDollarSign,
  Clock,
  Download,
  LayoutList,
  PieChart as PieChartIcon,
  Repeat,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Building2 } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  Badge,
  Button,
  DataTable,
  GradientPanel,
  Input,
  StatsCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
} from '@shesa/ui';

import { ScopeBodyMatrix } from './scope-body-matrix';

// ═══ Types ══════════════════════════════════════════════════════════

export interface ChargeSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly scopeName: string;
  readonly scopeSlug: string;
  readonly shape: string;
  readonly baseAmount: number | null;
  readonly currency: string;
  readonly recurrence: string;
  readonly recurrenceInterval: number;
  readonly status: string;
  readonly lifecycle: string | null;
  readonly activationDate: string | null;
  readonly createdAt: string;
  /** Goal target for `shape='goal'` — powers the goal-thermometer hero. */
  readonly goalAmount: number | null;
  /** Contribution window (goal / open / ticketed shapes). */
  readonly openDate: string | null;
  readonly closeDate: string | null;
}

export interface MatrixCell {
  readonly obligationId: string;
  readonly owed: number;
  readonly paid: number;
  readonly currency: string;
  readonly status: string;
  readonly prorated: boolean;
  /**
   * When the obligation's period ends. Used by the view to distinguish
   * "current" (period still open, not yet due) from "overdue" (period
   * has closed, still unpaid).
   */
  readonly periodEnd: string | null;
}

export interface MatrixMember {
  readonly memberId: string;
  readonly fullName: string;
  readonly cells: readonly (MatrixCell | null)[];
  /**
   * The earliest active/passive membership joined_at at this charge's
   * scope. When set, periods that end before this date render as
   * "Not applicable" — the member wasn't yet enrolled.
   */
  readonly joinedAt?: string | null;
  /**
   * `true` for scope-as-a-body rows (branch / chapter / batch owes as a
   * collective). Renders with a building icon instead of member initials
   * and a "scope" subtitle. Underlying obligation has party_type='branch'.
   */
  readonly isScopeBody?: boolean;
  readonly scopeType?: string | null;
}

export interface MatrixPeriod {
  readonly key: string;
  readonly periodStart: string | null;
  readonly periodEnd: string | null;
  readonly isUpcoming: boolean;
}

export interface PoolPayment {
  readonly id: string;
  readonly payerLabel: string;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  readonly source: string;
  readonly isReversal: boolean;
  readonly createdAt: string;
  /**
   * Set for obligation-linked payments (matrix mode). `undefined` for
   * pure pool payments that hit the charge directly. Used by the
   * scope-body Collection timeline to group payments per period.
   */
  readonly obligationId?: string | null;
}

export interface PaymentMethodStat {
  readonly method: string;
  readonly count: number;
  readonly amount: number;
}

export interface PaymentSourceStat {
  readonly source: string; // 'auto' | 'manual' | other
  readonly count: number;
  readonly amount: number;
}

export interface PaymentTimingStats {
  readonly count: number;
  readonly avgAmount: number;
  readonly medianAmount: number;
  readonly lastPaymentAt: string | null;
}

export interface SeriesPoint {
  readonly date: string; // yyyy-MM-dd
  readonly cumulative: number;
  readonly daily: number;
}

type MatrixRow = MatrixMember & {
  readonly serial: number;
  readonly _totalPaid?: number;
  readonly _totalOwed?: number;
  readonly _outstanding?: number;
  readonly _coverage?: number;
};
type PoolRow = PoolPayment & { readonly serial: number };

interface CommonProps {
  readonly summary: ChargeSummary;
  /** Where the "Back to charges" link points. Different per persona. */
  readonly backLinkHref: string;
  readonly paymentsByMethod: readonly PaymentMethodStat[];
  readonly paymentsBySource: readonly PaymentSourceStat[];
  readonly paymentTiming: PaymentTimingStats;
  readonly cumulativeSeries: readonly SeriesPoint[];
}

interface MatrixProps extends CommonProps {
  readonly mode: 'matrix';
  /**
   * `members` — obligations fan out to individual members (a branch's
   * monthly dues, a subset-of-batch levy). Reports lean on per-member
   * analysis: coverage distribution, top payers, most behind.
   *
   * `scope-body` — the whole obligation is owed by a scope (a chapter
   * or batch as a collective). There's no per-member split, so those
   * distribution panels don't add value. Reports switch to a payment
   * log + finance panel that emphasises what the scope has remitted.
   */
  readonly variant: 'members' | 'scope-body';
  readonly expected: number;
  readonly collected: number;
  readonly periods: readonly MatrixPeriod[];
  readonly members: readonly MatrixMember[];
  /** Flat log of every payment against this charge (settled + reversals). */
  readonly paymentLog: readonly PoolPayment[];
}

interface PoolProps extends CommonProps {
  readonly mode: 'pool';
  readonly collected: number;
  readonly payerCount: number;
  readonly poolPayments: readonly PoolPayment[];
}

type Props = MatrixProps | PoolProps;

// ═══ Palette + constants ════════════════════════════════════════════

// Tailwind-500 hexes for the donut. Colour-blind-friendlyish sequence:
// blue → emerald → amber → violet → rose → cyan → orange → slate.
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

const AXIS_TICK = {
  fill: 'var(--color-muted-foreground)',
  fontSize: 11,
} as const;

// Recharts' Tooltip `formatter` signature quotes `ValueType | undefined`.
// Wrap our currency formatter so the type checks and undefined turns
// into a placeholder rather than "NaN CFA".
const moneyTooltipFormatter =
  (currency: string) =>
  (value: unknown): string =>
    typeof value === 'number' ? formatMoney(value, currency) : '—';

// ═══ Main view ══════════════════════════════════════════════════════

export function ChargeDetailView(props: Props) {
  // Pool-mode carries collected + contributor count; matrix-mode has
  // members. The goal-thermometer hero wants the collected number so
  // the gauge fills to the right height even before you tap Reports.
  const collectedForHero =
    props.mode === 'pool' ? props.collected : props.mode === 'matrix' ? props.collected : 0;
  const contributorCount =
    props.mode === 'pool' ? props.payerCount : props.mode === 'matrix' ? props.members.length : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      {props.summary.shape === 'goal' && props.summary.goalAmount ? (
        <GoalHero
          summary={props.summary}
          backLinkHref={props.backLinkHref}
          collected={collectedForHero}
          contributorCount={contributorCount}
        />
      ) : (
        <Hero summary={props.summary} backLinkHref={props.backLinkHref} />
      )}
      <Tabs defaultValue="table" className="flex min-h-0 flex-1 flex-col gap-4">
        <TabsList className="self-start">
          <TabsTrigger value="table" className="gap-1.5">
            <LayoutList className="h-4 w-4" />
            Collection Table
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5">
            <PieChartIcon className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="table"
          className="flex min-h-0 flex-1 flex-col gap-4 focus-visible:outline-none"
        >
          {props.mode === 'matrix' ? (
            props.variant === 'scope-body' ? (
              <ScopeBodyMatrix
                summary={props.summary}
                periods={props.periods}
                members={props.members}
                paymentLog={props.paymentLog}
              />
            ) : (
              <MatrixTable {...props} />
            )
          ) : (
            <PoolTable {...props} />
          )}
        </TabsContent>

        <TabsContent
          value="reports"
          className="flex min-h-0 flex-1 flex-col gap-4 focus-visible:outline-none"
        >
          {props.mode === 'matrix' ? (
            props.variant === 'scope-body' ? (
              <ScopeBodyReports {...props} />
            ) : (
              <MatrixReports {...props} />
            )
          ) : (
            <PoolReports {...props} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══ Hero ═══════════════════════════════════════════════════════════

function Hero({
  summary,
  backLinkHref,
}: {
  readonly summary: ChargeSummary;
  readonly backLinkHref: string;
}) {
  const Icon =
    summary.shape === 'goal'
      ? Target
      : summary.shape === 'charge' || summary.shape === 'fixed'
        ? BadgeDollarSign
        : CircleDollarSign;

  // Inline header — no panel wrapper. Icon sits next to the title on
  // one line; meta row and (optional) description flow underneath.
  return (
    <div className="flex flex-col gap-2">
      <Link
        href={backLinkHref}
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to charges
      </Link>
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{summary.name}</h1>
        <StatusChip status={summary.status} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {summary.scopeName}
        </span>
        <span className="text-border">·</span>
        <span className="inline-flex items-center gap-1">
          <Repeat className="h-3 w-3" />
          {formatRecurrence(summary.recurrence, summary.recurrenceInterval)}
        </span>
        <span className="text-border">·</span>
        <span className="capitalize">{summary.shape}</span>
        {summary.baseAmount !== null && (
          <>
            <span className="text-border">·</span>
            <span className="text-foreground tabular-nums">
              {formatMoney(summary.baseAmount, summary.currency)}
            </span>
          </>
        )}
      </div>
      {summary.description && (
        <p className="text-xs leading-relaxed text-muted-foreground">{summary.description}</p>
      )}
    </div>
  );
}

// ═══ Goal-shape hero (thermometer) ══════════════════════════════════
//
// Fires for `shape='goal'` contributions with a goalAmount set.
// Renders a semicircular gauge showing raised vs. goal, plus a
// side-panel of vital numbers: raised, remaining, contributors,
// days-left, and a pace hint that flags whether the campaign is
// tracking ahead or behind schedule.

function GoalHero({
  summary,
  backLinkHref,
  collected,
  contributorCount,
}: {
  readonly summary: ChargeSummary;
  readonly backLinkHref: string;
  readonly collected: number;
  readonly contributorCount: number;
}) {
  const goal = summary.goalAmount ?? 0;
  const percent = goal > 0 ? Math.min(100, (collected / goal) * 100) : 0;
  const remaining = Math.max(0, goal - collected);
  const now = Date.now();
  const openTs = summary.openDate ? new Date(summary.openDate).getTime() : null;
  const closeTs = summary.closeDate ? new Date(summary.closeDate).getTime() : null;
  const daysLeft =
    closeTs != null ? Math.max(0, Math.ceil((closeTs - now) / (24 * 60 * 60 * 1000))) : null;
  const closed = closeTs != null && closeTs <= now;

  // Pace hint — where progress should be if fundraising were linear
  // between open and close dates. Ahead / behind / on-track / n-a.
  const paceHint = useMemo(() => {
    if (openTs == null || closeTs == null || closeTs <= openTs || goal === 0) return null;
    const total = closeTs - openTs;
    const elapsed = Math.min(total, Math.max(0, now - openTs));
    const expectedPercent = (elapsed / total) * 100;
    const delta = percent - expectedPercent;
    return {
      expectedPercent: Math.round(expectedPercent),
      delta: Math.round(delta),
    };
  }, [openTs, closeTs, goal, percent, now]);

  const complete = percent >= 100;

  return (
    <div className="flex flex-col gap-3">
      <Link
        href={backLinkHref}
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to charges
      </Link>

      <GradientPanel className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center">
        {/* Semi-circle thermometer */}
        <div className="relative flex h-40 w-full max-w-70 shrink-0 items-end self-center lg:self-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Raised', value: Math.max(0.0001, percent) },
                  { name: 'Remaining', value: Math.max(0.0001, 100 - percent) },
                ]}
                cx="50%"
                cy="90%"
                startAngle={180}
                endAngle={0}
                innerRadius={70}
                outerRadius={110}
                paddingAngle={complete ? 0 : 1}
                dataKey="value"
                stroke="var(--color-card)"
                strokeWidth={2}
              >
                <Cell fill={complete ? '#10b981' : '#3b82f6'} />
                <Cell fill="var(--color-muted)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-3">
            <span
              className={`text-4xl font-semibold tabular-nums ${
                complete ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
              }`}
            >
              {Math.round(percent)}%
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              of goal
            </span>
          </div>
        </div>

        {/* Right-side content */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{summary.name}</h1>
            <StatusChip status={summary.status} />
            {closed && (
              <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground">
                Closed
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <span className="text-foreground tabular-nums">
              <span className="font-semibold">{formatMoney(collected, summary.currency)}</span>{' '}
              <span className="text-muted-foreground">
                of {formatMoney(goal, summary.currency)}
              </span>
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              {contributorCount} contributor{contributorCount === 1 ? '' : 's'}
            </span>
          </div>

          {/* Vital numbers grid */}
          <div className="grid gap-2 sm:grid-cols-3">
            <GoalVital
              label="Remaining"
              value={complete ? '—' : formatMoney(remaining, summary.currency)}
              hint={complete ? 'goal reached' : undefined}
              tone={complete ? 'emerald' : 'default'}
            />
            <GoalVital
              label={closed ? 'Ended' : 'Days left'}
              value={
                daysLeft === null
                  ? '—'
                  : closed
                    ? summary.closeDate
                      ? new Date(summary.closeDate).toLocaleDateString()
                      : '—'
                    : `${daysLeft}d`
              }
              hint={
                summary.closeDate && !closed
                  ? `Closes ${new Date(summary.closeDate).toLocaleDateString()}`
                  : undefined
              }
              tone={daysLeft !== null && !closed && daysLeft <= 7 ? 'amber' : 'default'}
            />
            <GoalVital
              label="Pace"
              value={
                paceHint === null
                  ? '—'
                  : paceHint.delta >= 5
                    ? `+${paceHint.delta}%`
                    : paceHint.delta <= -5
                      ? `${paceHint.delta}%`
                      : 'on track'
              }
              hint={
                paceHint === null ? 'no schedule' : `${paceHint.expectedPercent}% expected today`
              }
              tone={
                paceHint === null
                  ? 'default'
                  : paceHint.delta >= 5
                    ? 'emerald'
                    : paceHint.delta <= -5
                      ? 'destructive'
                      : 'default'
              }
            />
          </div>

          {summary.description && (
            <p className="text-xs leading-relaxed text-muted-foreground">{summary.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {summary.scopeName}
            </span>
            <span className="text-border">·</span>
            <span className="capitalize">Goal contribution</span>
            {summary.openDate && (
              <>
                <span className="text-border">·</span>
                <span>Opened {new Date(summary.openDate).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>
      </GradientPanel>
    </div>
  );
}

function GoalVital({
  label,
  value,
  hint,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly tone: 'default' | 'emerald' | 'amber' | 'destructive';
}) {
  const toneClass: Record<typeof tone, string> = {
    default: 'text-foreground',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    amber: 'text-amber-700 dark:text-amber-400',
    destructive: 'text-destructive',
  };
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-card px-3 py-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${toneClass[tone]}`}>{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function StatusChip({ status }: { readonly status: string }) {
  const styles: Record<string, string> = {
    active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    draft: 'border-border bg-muted/40 text-foreground',
    paused: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    archived: 'border-border bg-muted/40 text-muted-foreground',
  };
  return (
    <Badge variant="outline" className={`capitalize ${styles[status] ?? styles.draft}`}>
      {status}
    </Badge>
  );
}

// ═══ Matrix collection table ════════════════════════════════════════

type MemberFilter = 'all' | 'fully_paid' | 'partial' | 'behind' | 'unpaid';

function MatrixTable({ summary, periods, members }: MatrixProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MemberFilter>('all');
  const [gridApi, setGridApi] = useState<GridApi<MatrixRow> | null>(null);

  // "Current period" — the most recent non-upcoming period whose start
  // is on-or-before today. Used to auto-scroll the matrix so the
  // active month lands in view and to highlight the header column.
  const currentPeriodKey = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const activePast = periods
      .filter((p) => !p.isUpcoming && p.periodStart != null)
      .filter((p) => (p.periodStart ?? '') <= today);
    if (activePast.length > 0) return activePast[activePast.length - 1]!.key;
    // Fall back to the newest existing period if nothing is on-or-before
    // today (e.g. brand-new charge with no obligations yet).
    const anyNonUpcoming = periods.filter((p) => !p.isUpcoming);
    return anyNonUpcoming[anyNonUpcoming.length - 1]?.key ?? null;
  }, [periods]);

  // On grid ready or when the current-period key shifts (e.g. filter
  // change that re-mounts), centre the current-period column so the
  // operator sees ~3 past + 3 future without manual scrolling.
  useEffect(() => {
    if (!gridApi || !currentPeriodKey) return;
    // AG-Grid's ensureColumnVisible ignores `middle` for pinned columns
    // and does the right thing for scrollable ones — perfect fit here.
    gridApi.ensureColumnVisible(`period_${currentPeriodKey}`, 'middle');
  }, [gridApi, currentPeriodKey]);

  // Compute per-member totals once so filtering + sorting share the work.
  const withTotals = useMemo(() => {
    return members.map((m) => {
      const t = m.cells.reduce(
        (acc, c, idx) => {
          const p = periods[idx];
          if (!c || !p || p.isUpcoming) return acc;
          acc.paid += c.paid;
          acc.owed += c.owed;
          return acc;
        },
        { paid: 0, owed: 0 },
      );
      const outstanding = Math.max(0, t.owed - t.paid);
      const coverage = t.owed > 0 ? Math.min(1, t.paid / t.owed) : 1;
      const state: MemberFilter =
        t.owed <= 0.0001
          ? 'fully_paid'
          : t.paid <= 0.0001
            ? 'unpaid'
            : outstanding <= 0.0001
              ? 'fully_paid'
              : 'partial';
      return { member: m, paid: t.paid, owed: t.owed, outstanding, coverage, state };
    });
  }, [members, periods]);

  const filtered = useMemo<readonly MatrixRow[]>(() => {
    const q = search.trim().toLowerCase();
    return withTotals
      .filter((row) => {
        if (q && !row.member.fullName.toLowerCase().includes(q)) return false;
        if (filter === 'all') return true;
        if (filter === 'behind') return row.outstanding > 0.0001;
        if (filter === 'fully_paid') return row.state === 'fully_paid' && row.owed > 0;
        if (filter === 'partial') return row.state === 'partial';
        if (filter === 'unpaid') return row.state === 'unpaid';
        return true;
      })
      .sort(
        (a, b) =>
          b.outstanding - a.outstanding || a.member.fullName.localeCompare(b.member.fullName),
      )
      .map((row, i) => ({
        ...row.member,
        serial: i + 1,
        _totalPaid: row.paid,
        _totalOwed: row.owed,
        _outstanding: row.outstanding,
        _coverage: row.coverage,
      }));
  }, [withTotals, search, filter]);

  const filterCounts = useMemo(() => {
    let behind = 0;
    let fullyPaid = 0;
    let partial = 0;
    let unpaid = 0;
    for (const r of withTotals) {
      if (r.owed <= 0.0001) continue;
      if (r.state === 'fully_paid') fullyPaid += 1;
      else if (r.state === 'partial') partial += 1;
      else if (r.state === 'unpaid') unpaid += 1;
      if (r.outstanding > 0.0001) behind += 1;
    }
    return { all: withTotals.length, behind, fullyPaid, partial, unpaid };
  }, [withTotals]);

  const columnDefs = useMemo<ColDef<MatrixRow>[]>(() => {
    const cols: ColDef<MatrixRow>[] = [
      {
        headerName: '#',
        field: 'serial',
        width: 56,
        maxWidth: 56,
        sortable: false,
        filter: false,
        pinned: 'left',
        cellClass: 'text-xs text-muted-foreground',
      },
      {
        headerName: 'Member',
        field: 'fullName',
        pinned: 'left',
        minWidth: 220,
        flex: 1,
        cellRenderer: (p: ICellRendererParams<MatrixRow>) =>
          p.data ? <MemberCell member={p.data} currency={summary.currency} /> : null,
      },
      {
        headerName: 'Coverage',
        colId: 'coverage',
        width: 150,
        pinned: 'left',
        valueGetter: (p) => (p.data as MatrixRow | undefined)?._coverage ?? 0,
        cellRenderer: (p: ICellRendererParams<MatrixRow>) =>
          p.data ? <CoverageBar percent={Math.round((p.data._coverage ?? 0) * 100)} /> : null,
      },
    ];
    periods.forEach((period, colIdx) => {
      const isCurrent = period.key === currentPeriodKey;
      cols.push({
        headerName: formatPeriodHeader(period) + (isCurrent ? ' · today' : ''),
        colId: `period_${period.key}`,
        width: 150,
        sortable: false,
        filter: false,
        headerClass: period.isUpcoming
          ? 'ag-header-upcoming'
          : isCurrent
            ? 'ag-header-current'
            : undefined,
        cellClass: isCurrent ? '!bg-primary/5' : period.isUpcoming ? '!bg-muted/20' : undefined,
        cellRenderer: (p: ICellRendererParams<MatrixRow>) => {
          if (!p.data) return null;
          if (period.isUpcoming) return <UpcomingChip />;
          const cell = p.data.cells[colIdx];
          if (!cell) {
            // No obligation for this member × period. If the member
            // wasn't yet enrolled during this period, render an
            // accounting-friendly "N/A" instead of an ambiguous dash.
            const joinedAt = p.data.joinedAt;
            const periodEnd = period.periodEnd;
            if (joinedAt && periodEnd) {
              const j = new Date(joinedAt).getTime();
              const e = new Date(periodEnd).getTime();
              if (Number.isFinite(j) && Number.isFinite(e) && e <= j) {
                return <NotApplicableChip />;
              }
            }
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return <CellChip cell={cell} />;
        },
      });
    });
    cols.push(
      {
        headerName: 'Paid',
        colId: 'paid',
        flex: 1,
        minWidth: 150,
        valueGetter: (p) => (p.data as MatrixRow | undefined)?._totalPaid ?? 0,
        cellRenderer: (p: ICellRendererParams<MatrixRow>) =>
          p.data ? (
            <span className="text-sm font-medium text-foreground tabular-nums">
              {formatMoney(p.data._totalPaid ?? 0, summary.currency)}
            </span>
          ) : null,
      },
      {
        headerName: 'Outstanding',
        colId: 'outstanding',
        flex: 1,
        minWidth: 200,
        sort: 'desc',
        valueGetter: (p) => (p.data as MatrixRow | undefined)?._outstanding ?? 0,
        cellRenderer: (p: ICellRendererParams<MatrixRow>) => {
          if (!p.data) return null;
          const out = p.data._outstanding ?? 0;
          return (
            <span
              className={`text-sm font-medium tabular-nums ${
                out > 0.0001 ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {out > 0.0001 ? formatMoney(out, summary.currency) : '—'}
            </span>
          );
        },
      },
    );
    return cols;
  }, [periods, summary.currency, currentPeriodKey]);

  const exportCsv = () => {
    const activePeriods = periods.filter((p) => !p.isUpcoming);
    const header = [
      'Member',
      ...activePeriods.map((p) => `${formatPeriodHeader(p)} Paid`),
      ...activePeriods.map((p) => `${formatPeriodHeader(p)} Owed`),
      'Total Paid',
      'Total Owed',
      'Outstanding',
      'Coverage %',
      'Currency',
    ];
    const rows: string[][] = members.map((m) => {
      const paidCols: string[] = [];
      const owedCols: string[] = [];
      let totalPaid = 0;
      let totalOwed = 0;
      periods.forEach((p, idx) => {
        if (p.isUpcoming) return;
        const c = m.cells[idx];
        paidCols.push(c ? c.paid.toFixed(2) : '');
        owedCols.push(c ? c.owed.toFixed(2) : '');
        if (c) {
          totalPaid += c.paid;
          totalOwed += c.owed;
        }
      });
      const outstanding = Math.max(0, totalOwed - totalPaid);
      const coverage = totalOwed > 0 ? (totalPaid / totalOwed) * 100 : 100;
      return [
        m.fullName,
        ...paidCols,
        ...owedCols,
        totalPaid.toFixed(2),
        totalOwed.toFixed(2),
        outstanding.toFixed(2),
        coverage.toFixed(1),
        summary.currency,
      ];
    });
    downloadCsv(`${slugify(summary.name)}-collection`, [header, ...rows]);
  };

  const upcomingCount = periods.filter((p) => p.isUpcoming).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChipRow filter={filter} onChange={setFilter} counts={filterCounts} />
        <div className="flex items-center gap-2">
          <Input
            type="search"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-56"
          />
          {currentPeriodKey && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => gridApi?.ensureColumnVisible(`period_${currentPeriodKey}`, 'middle')}
              className="gap-1.5"
              title="Scroll to today's period"
            >
              <Clock className="h-3.5 w-3.5" />
              Today
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <MatrixLegend />
        <span>
          {filtered.length} of {members.length} {members.length === 1 ? 'member' : 'members'}
          {upcomingCount > 0 &&
            ` · ${upcomingCount} upcoming period${upcomingCount === 1 ? '' : 's'}`}
          {' · scroll ↔ for more history'}
        </span>
      </div>

      <DataTable<MatrixRow>
        rowData={filtered as MatrixRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.memberId}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable={false}
      />
    </div>
  );
}

function FilterChipRow({
  filter,
  onChange,
  counts,
}: {
  readonly filter: MemberFilter;
  readonly onChange: (f: MemberFilter) => void;
  readonly counts: {
    all: number;
    behind: number;
    fullyPaid: number;
    partial: number;
    unpaid: number;
  };
}) {
  const items: readonly { key: MemberFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'behind', label: 'Behind', count: counts.behind },
    { key: 'unpaid', label: 'Not paid', count: counts.unpaid },
    { key: 'partial', label: 'Partial', count: counts.partial },
    { key: 'fully_paid', label: 'Fully paid', count: counts.fullyPaid },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-0.5">
      {items.map((it) => {
        const active = filter === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {it.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                active
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {it.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MemberCell({
  member,
  currency,
}: {
  readonly member: MatrixRow;
  readonly currency: string;
}) {
  const behind = (member._outstanding ?? 0) > 0.0001;
  const totallyPaid = (member._totalOwed ?? 0) > 0.0001 && (member._outstanding ?? 0) <= 0.0001;
  const isScopeBody = !!member.isScopeBody;
  const initials = getInitials(member.fullName);

  return (
    <div className="flex h-full items-center gap-2.5 py-1">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center text-xs font-medium ${
          isScopeBody ? 'rounded-md' : 'rounded-full'
        } ${
          behind
            ? 'bg-destructive/10 text-destructive'
            : totallyPaid
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {isScopeBody ? <Building2 className="h-4 w-4" /> : initials}
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium text-foreground">{member.fullName}</span>
        <span className="truncate text-[11px] text-muted-foreground tabular-nums">
          {isScopeBody && member.scopeType && (
            <span className="mr-1 capitalize italic">{member.scopeType} · as body ·</span>
          )}
          {formatMoney(member._totalPaid ?? 0, currency)} of{' '}
          {formatMoney(member._totalOwed ?? 0, currency)}
        </span>
      </div>
    </div>
  );
}

function CoverageBar({ percent }: { readonly percent: number }) {
  const color =
    percent >= 100
      ? 'bg-emerald-500'
      : percent >= 70
        ? 'bg-sky-500'
        : percent >= 40
          ? 'bg-amber-500'
          : 'bg-destructive';
  return (
    <div className="flex h-full items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <span
        className={`shrink-0 text-xs tabular-nums ${
          percent >= 100 ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-foreground'
        }`}
      >
        {percent}%
      </span>
    </div>
  );
}

type CellStateKey =
  'paid' | 'partial' | 'open' | 'overdue' | 'waived' | 'cancelled' | 'upcoming' | 'not_applicable';

function MatrixLegend() {
  const items: readonly {
    state: CellStateKey;
    label: string;
  }[] = [
    { state: 'paid', label: 'Paid' },
    { state: 'partial', label: 'Partial' },
    { state: 'open', label: 'Current' },
    { state: 'overdue', label: 'In arrears' },
    { state: 'waived', label: 'Waived' },
    { state: 'upcoming', label: 'Upcoming' },
    { state: 'not_applicable', label: 'N/A (pre-enrolment)' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.state} className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${DOT[i.state]}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

const DOT: Record<CellStateKey, string> = {
  paid: 'bg-emerald-500',
  partial: 'bg-amber-500',
  // "current" (open) — this cycle, not yet overdue. Blue instead of the
  // old red so operators can tell it apart from the actual debt state.
  open: 'bg-sky-500',
  // "overdue" (in arrears) — past due, still unpaid. This is the debt
  // signal, so it takes the destructive red the old "open" used.
  overdue: 'bg-destructive',
  // "waived" — status='forgiven'. Sky-blue so it reads as intentional.
  waived: 'bg-sky-500',
  cancelled: 'bg-muted-foreground/40',
  upcoming: 'bg-slate-400 dark:bg-slate-500',
  not_applicable: 'bg-muted-foreground/30',
};

function deriveCellState(cell: MatrixCell): CellStateKey {
  if (cell.status === 'forgiven') return 'waived';
  if (cell.status === 'cancelled') return 'cancelled';
  const balance = cell.owed - cell.paid;
  if (balance <= 0.0001) return 'paid';
  if (cell.paid > 0) return 'partial';
  // Nothing paid — decide current vs overdue based on period_end. A
  // period that has already ended and stayed unpaid is in arrears; one
  // whose window is still open is "current".
  if (cell.periodEnd) {
    const end = new Date(cell.periodEnd).getTime();
    if (Number.isFinite(end) && end < Date.now()) return 'overdue';
  }
  return 'open';
}

function CellChip({ cell }: { cell: MatrixCell }) {
  const state = deriveCellState(cell);
  const label: Record<CellStateKey, string> = {
    paid: 'Paid',
    partial: 'Partial',
    open: 'Current',
    overdue: 'In arrears',
    waived: 'Waived',
    cancelled: 'Cancelled',
    upcoming: 'Upcoming',
    not_applicable: 'N/A',
  };

  const settledOrClosed =
    state === 'paid' || state === 'waived' || state === 'cancelled' || state === 'not_applicable';

  return (
    <div className="flex flex-col gap-1 leading-tight">
      <span className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-foreground">
        <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[state]}`} />
        {label[state]}
      </span>
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {settledOrClosed
          ? formatMoney(cell.owed, cell.currency)
          : `${formatMoney(cell.paid, cell.currency)} / ${formatMoney(cell.owed, cell.currency)}`}
        {cell.prorated && <span className="ml-1">·pro-rated</span>}
      </span>
    </div>
  );
}

function UpcomingChip() {
  return (
    <div className="flex flex-col gap-1 leading-tight opacity-70">
      <span className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Clock className="h-3 w-3" />
        Upcoming
      </span>
      <span className="text-[11px] italic text-muted-foreground">not yet due</span>
    </div>
  );
}

function NotApplicableChip() {
  return (
    <div className="flex flex-col gap-1 leading-tight opacity-70">
      <span className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <span className={`h-2 w-2 shrink-0 rounded-full ${DOT.not_applicable}`} />
        N/A
      </span>
      <span className="text-[11px] italic text-muted-foreground">pre-enrolment</span>
    </div>
  );
}

// ═══ Pool collection table ══════════════════════════════════════════

function PoolTable({ summary, poolPayments }: PoolProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo<readonly PoolRow[]>(() => {
    const q = search.trim().toLowerCase();
    return poolPayments
      .filter((p) => (q ? p.payerLabel.toLowerCase().includes(q) : true))
      .map((p, i) => ({ ...p, serial: i + 1 }));
  }, [poolPayments, search]);

  const columnDefs = useMemo<ColDef<PoolRow>[]>(
    () => [
      {
        headerName: 'S/N',
        field: 'serial',
        width: 68,
        maxWidth: 68,
        sortable: false,
        filter: false,
      },
      {
        headerName: 'Payer',
        field: 'payerLabel',
        flex: 1.5,
        minWidth: 220,
        cellRenderer: (p: ICellRendererParams<PoolRow>) =>
          p.data ? (
            <div className="flex h-full items-center gap-2.5 py-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {getInitials(p.data.payerLabel)}
              </div>
              <span className="truncate text-sm font-medium text-foreground">
                {p.data.payerLabel}
              </span>
            </div>
          ) : null,
      },
      {
        headerName: 'Amount',
        field: 'amount',
        width: 160,
        cellRenderer: (p: ICellRendererParams<PoolRow>) => {
          if (!p.data) return null;
          return (
            <span
              className={`text-sm tabular-nums ${
                p.data.isReversal ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
              }`}
            >
              {p.data.isReversal ? '-' : ''}
              {formatMoney(p.data.amount, p.data.currency)}
            </span>
          );
        },
      },
      {
        headerName: 'Method',
        field: 'method',
        width: 140,
        valueFormatter: (p) => formatMethod(p.value ?? ''),
      },
      {
        headerName: 'Source',
        field: 'source',
        width: 110,
        cellRenderer: (p: ICellRendererParams<PoolRow, string>) => (
          <Badge
            variant="outline"
            className={
              p.value === 'auto'
                ? 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                : 'border-border text-foreground'
            }
          >
            {p.value === 'auto' ? 'Auto' : 'Manual'}
          </Badge>
        ),
      },
      {
        headerName: 'When',
        field: 'createdAt',
        width: 180,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString() : '—'),
      },
    ],
    [],
  );

  const exportCsv = () => {
    const header = ['Payer', 'Amount', 'Currency', 'Method', 'Source', 'Reversal', 'When'];
    const rows: string[][] = poolPayments.map((p) => [
      p.payerLabel,
      p.amount.toFixed(2),
      p.currency,
      formatMethod(p.method),
      p.source === 'auto' ? 'Auto' : 'Manual',
      p.isReversal ? 'Yes' : 'No',
      p.createdAt,
    ]);
    downloadCsv(`${slugify(summary.name)}-payments`, [header, ...rows]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          type="search"
          placeholder="Search payers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64"
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {poolPayments.length}{' '}
            {poolPayments.length === 1 ? 'payment' : 'payments'}
          </span>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>
      <DataTable<PoolRow>
        rowData={filtered as PoolRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        showColumnPicker={false}
        selectable={false}
      />
    </div>
  );
}

// ═══ Reports — matrix ═══════════════════════════════════════════════

function MatrixReports(props: MatrixProps) {
  const {
    summary,
    expected,
    collected,
    periods,
    members,
    paymentsByMethod,
    paymentsBySource,
    paymentTiming,
    cumulativeSeries,
  } = props;
  const outstanding = Math.max(0, expected - collected);
  const progress = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0;
  const activePeriods = periods.filter((p) => !p.isUpcoming).length;

  // Per-period aggregation for the stacked bar + leaderboard.
  const periodStats = useMemo(() => {
    return periods
      .filter((p) => !p.isUpcoming)
      .map((p) => {
        const originalIdx = periods.findIndex((pp) => pp.key === p.key);
        let paid = 0;
        let owed = 0;
        let paidMembers = 0;
        let totalMembers = 0;
        for (const m of members) {
          const c = m.cells[originalIdx];
          if (!c) continue;
          totalMembers += 1;
          paid += c.paid;
          owed += c.owed;
          if (c.owed - c.paid <= 0.0001) paidMembers += 1;
        }
        return {
          key: p.key,
          period: formatPeriodHeader(p),
          Paid: Math.round(paid),
          Outstanding: Math.round(Math.max(0, owed - paid)),
          coverage: owed > 0 ? paid / owed : 0,
          paidMembers,
          totalMembers,
        };
      });
  }, [periods, members]);

  const collectionByPeriod = useMemo(() => periodStats.slice().reverse(), [periodStats]);

  // Coverage histogram: how many members fall in each coverage bucket.
  const coverageDistribution = useMemo(() => {
    const buckets = [
      { key: '0', label: '0%', min: 0, max: 0.0001, count: 0 },
      { key: '1-25', label: '1–25%', min: 0.0001, max: 0.25, count: 0 },
      { key: '25-50', label: '25–50%', min: 0.25, max: 0.5, count: 0 },
      { key: '50-75', label: '50–75%', min: 0.5, max: 0.75, count: 0 },
      { key: '75-99', label: '75–99%', min: 0.75, max: 0.9999, count: 0 },
      { key: '100', label: '100%', min: 0.9999, max: 1.0001, count: 0 },
    ];
    for (const m of members) {
      const t = m.cells.reduce(
        (acc, c, idx) => {
          const p = periods[idx];
          if (!c || !p || p.isUpcoming) return acc;
          acc.paid += c.paid;
          acc.owed += c.owed;
          return acc;
        },
        { paid: 0, owed: 0 },
      );
      if (t.owed <= 0) continue;
      const cov = Math.min(1, t.paid / t.owed);
      for (const b of buckets) {
        if (cov >= b.min && cov < b.max) {
          b.count += 1;
          break;
        }
      }
    }
    return buckets;
  }, [members, periods]);

  const memberTotals = useMemo(
    () =>
      members
        .map((m) => {
          const t = m.cells.reduce(
            (acc, c, idx) => {
              const p = periods[idx];
              if (!c || !p || p.isUpcoming) return acc;
              acc.paid += c.paid;
              acc.owed += c.owed;
              return acc;
            },
            { paid: 0, owed: 0 },
          );
          return {
            memberId: m.memberId,
            name: m.fullName,
            paid: t.paid,
            owed: t.owed,
            outstanding: Math.max(0, t.owed - t.paid),
          };
        })
        .sort((a, b) => b.paid - a.paid),
    [members, periods],
  );

  const topPayers = memberTotals.filter((m) => m.paid > 0).slice(0, 5);
  const behind = memberTotals
    .filter((m) => m.outstanding > 0.0001)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 5);
  const fullyPaid = memberTotals.filter((m) => m.owed > 0 && m.outstanding < 0.0001).length;
  const bestPeriod = [...periodStats].sort((a, b) => b.coverage - a.coverage)[0];
  const worstPeriod = [...periodStats].sort((a, b) => a.coverage - b.coverage)[0];
  const arpm = members.length > 0 ? collected / members.length : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Row 1 — headline KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard label="Members" value={members.length.toLocaleString()} />
        <StatsCard label="Active periods" value={activePeriods.toLocaleString()} />
        <StatsCard label="Expected" value={formatMoney(expected, summary.currency)} />
        <StatsCard label="Collected" value={formatMoney(collected, summary.currency)} />
        <StatsCard label="Outstanding" value={formatMoney(outstanding, summary.currency)} />
      </div>

      {/* Row 2 — vital signs */}
      <VitalSignsStrip
        currency={summary.currency}
        progress={progress}
        timing={paymentTiming}
        arpm={arpm}
        fullyPaid={fullyPaid}
        totalMembers={members.length}
        bestPeriodLabel={bestPeriod?.period ?? '—'}
        bestPeriodCoverage={bestPeriod ? Math.round(bestPeriod.coverage * 100) : null}
      />

      <ProgressPanel
        progress={progress}
        collected={collected}
        outstanding={outstanding}
        fullyPaid={fullyPaid}
        totalMembers={members.length}
        currency={summary.currency}
      />

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Collection by period" subtitle="Paid vs. still owed per cycle">
          {collectionByPeriod.length === 0 ? (
            <EmptyChart message="No active periods yet." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={collectionByPeriod} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis dataKey="period" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => compactNumber(v as number)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={moneyTooltipFormatter(summary.currency)}
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.35 }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, color: 'var(--color-muted-foreground)' }}
                />
                <Bar dataKey="Paid" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Outstanding" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Cumulative collection" subtitle="Running total over time">
          <CumulativeArea series={cumulativeSeries} currency={summary.currency} />
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Payment methods" subtitle="Share of collected amount">
          <MethodDonut methods={paymentsByMethod} currency={summary.currency} />
        </ChartCard>

        <ChartCard title="Payment source" subtitle="Auto-generated vs. manually recorded">
          <SourceComposition sources={paymentsBySource} currency={summary.currency} />
        </ChartCard>

        <ChartCard title="Coverage distribution" subtitle="Members by paid-share bucket">
          <CoverageHistogram data={coverageDistribution} />
        </ChartCard>
      </div>

      {/* Ranked tables */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RankPanel
          title="Top payers"
          icon={TrendingUp}
          iconClass="text-emerald-600 dark:text-emerald-400"
          empty="No payments yet."
          rows={topPayers.map((m) => ({
            id: m.memberId,
            label: m.name,
            value: formatMoney(m.paid, summary.currency),
          }))}
        />
        <RankPanel
          title="Most behind"
          icon={TrendingDown}
          iconClass="text-destructive"
          empty="Everyone is caught up."
          rows={behind.map((m) => ({
            id: m.memberId,
            label: m.name,
            value: formatMoney(m.outstanding, summary.currency),
          }))}
        />
      </div>

      {/* Period leaderboard */}
      {periodStats.length > 0 && (
        <PeriodLeaderboard
          rows={periodStats.slice().sort((a, b) => b.coverage - a.coverage)}
          bestLabel={bestPeriod?.period ?? '—'}
          worstLabel={worstPeriod?.period ?? '—'}
          bestCoverage={bestPeriod ? bestPeriod.coverage : null}
          worstCoverage={worstPeriod ? worstPeriod.coverage : null}
          currency={summary.currency}
        />
      )}

      {/* Yearly analysis — only surfaces when we have data across
       * more than one calendar month (otherwise the panel is noise). */}
      <YearlyAnalysis periods={periods} members={members} currency={summary.currency} />
    </div>
  );
}

// ═══ Yearly analysis (matrix — members variant) ═════════════════════
//
// Rolls each period's paid + owed into calendar years, then surfaces
// four views:
//   1. YTD vs prior-YTD KPIs (through the same calendar day).
//   2. Yearly totals bar — expected vs collected per year.
//   3. Monthly heatmap — rows = years, columns = Jan → Dec, cells
//      coloured by coverage so seasonal dips read at a glance.
//   4. Seasonal line — average coverage per calendar month across
//      every year in the dataset.
//
// The section short-circuits to a placeholder when the charge doesn't
// yet have periods spanning at least two distinct calendar months.

function YearlyAnalysis({
  periods,
  members,
  currency,
}: {
  readonly periods: readonly MatrixPeriod[];
  readonly members: readonly MatrixMember[];
  readonly currency: string;
}) {
  const stats = useMemo(() => {
    const perYear = new Map<
      number,
      {
        paid: number;
        owed: number;
        months: Map<number, { paid: number; owed: number }>;
      }
    >();
    periods.forEach((p, originalIdx) => {
      if (p.isUpcoming || !p.periodStart) return;
      const d = new Date(p.periodStart);
      if (Number.isNaN(d.getTime())) return;
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth();
      let paidPeriod = 0;
      let owedPeriod = 0;
      for (const m of members) {
        const c = m.cells[originalIdx];
        if (!c) continue;
        paidPeriod += c.paid;
        owedPeriod += c.owed;
      }
      const yEntry = perYear.get(year) ?? { paid: 0, owed: 0, months: new Map() };
      yEntry.paid += paidPeriod;
      yEntry.owed += owedPeriod;
      const cur = yEntry.months.get(month) ?? { paid: 0, owed: 0 };
      cur.paid += paidPeriod;
      cur.owed += owedPeriod;
      yEntry.months.set(month, cur);
      perYear.set(year, yEntry);
    });
    return Array.from(perYear.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, s]) => ({
        year,
        paid: s.paid,
        owed: s.owed,
        coverage: s.owed > 0 ? Math.round((s.paid / s.owed) * 100) : 0,
        months: s.months,
      }));
  }, [periods, members]);

  const hasEnoughData = useMemo(() => {
    const distinctMonths = new Set<string>();
    periods.forEach((p) => {
      if (p.isUpcoming || !p.periodStart) return;
      distinctMonths.add(p.periodStart.slice(0, 7));
    });
    return distinctMonths.size >= 2;
  }, [periods]);

  if (!hasEnoughData) {
    return (
      <GradientPanel className="flex flex-col gap-2 p-5">
        <span className="text-sm font-medium text-foreground">Yearly analysis</span>
        <p className="text-xs italic text-muted-foreground">
          Not enough history yet. Yearly rollups surface once the charge has periods across two or
          more calendar months.
        </p>
      </GradientPanel>
    );
  }

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  // YTD vs prior YTD — bounded to months already elapsed this year so
  // the comparison is like-for-like (through July, say).
  const thisYear = stats.find((y) => y.year === currentYear);
  const priorYear = stats.find((y) => y.year === currentYear - 1);
  const ytd = useMemo(() => {
    const sumThrough = (year: (typeof stats)[number] | undefined) => {
      if (!year) return { paid: 0, owed: 0 };
      let paid = 0;
      let owed = 0;
      for (const [m, v] of year.months) {
        if (m > currentMonth) continue;
        paid += v.paid;
        owed += v.owed;
      }
      return { paid, owed };
    };
    const cur = sumThrough(thisYear);
    const prev = sumThrough(priorYear);
    const delta = prev.paid > 0 ? Math.round(((cur.paid - prev.paid) / prev.paid) * 100) : null;
    return { cur, prev, delta };
  }, [thisYear, priorYear, currentMonth]);

  const seasonal = useMemo(() => {
    const bins = Array.from({ length: 12 }, (_, m) => ({
      month: m,
      totalPaid: 0,
      totalOwed: 0,
      samples: 0,
    }));
    for (const y of stats) {
      for (const [m, v] of y.months) {
        const bin = bins[m];
        if (!bin) continue;
        bin.totalPaid += v.paid;
        bin.totalOwed += v.owed;
        bin.samples += 1;
      }
    }
    return bins.map((b) => ({
      label: monthShort(b.month),
      coverage: b.totalOwed > 0 ? Math.round((b.totalPaid / b.totalOwed) * 100) : 0,
      samples: b.samples,
    }));
  }, [stats]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium text-foreground">Yearly analysis</span>
        <span className="text-xs text-muted-foreground">
          {stats.length} year{stats.length === 1 ? '' : 's'} of history
        </span>
      </div>

      {/* YTD comparison KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <VitalStat
          label={`YTD collected (${currentYear})`}
          value={formatMoney(ytd.cur.paid, currency)}
          hint={`through ${monthShort(currentMonth)}`}
        />
        <VitalStat
          label={`Prior YTD (${currentYear - 1})`}
          value={priorYear ? formatMoney(ytd.prev.paid, currency) : '—'}
          hint={priorYear ? `same window last year` : 'no prior year'}
        />
        <VitalStat
          label="YoY delta"
          value={ytd.delta === null ? '—' : `${ytd.delta >= 0 ? '+' : ''}${ytd.delta}%`}
          hint={
            ytd.delta === null
              ? 'no comparable prior period'
              : ytd.delta >= 0
                ? 'ahead of last year'
                : 'behind last year'
          }
        />
        <VitalStat
          label="Best year"
          value={
            stats.length > 0
              ? String(stats.slice().sort((a, b) => b.coverage - a.coverage)[0]!.year)
              : '—'
          }
          hint={
            stats.length > 0
              ? `${stats.slice().sort((a, b) => b.coverage - a.coverage)[0]!.coverage}% coverage`
              : ''
          }
        />
      </div>

      {/* Yearly totals bar + seasonal line, side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Yearly totals" subtitle="Collected vs expected per year">
          {stats.length === 0 ? (
            <EmptyChart message="No history yet." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={stats.map((y) => ({
                  year: String(y.year),
                  Collected: Math.round(y.paid),
                  Outstanding: Math.round(Math.max(0, y.owed - y.paid)),
                }))}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis dataKey="year" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => compactNumber(v as number)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={moneyTooltipFormatter(currency)}
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.35 }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, color: 'var(--color-muted-foreground)' }}
                />
                <Bar dataKey="Collected" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Outstanding" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Seasonal coverage" subtitle="Avg coverage by calendar month">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={seasonal} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => (typeof v === 'number' ? `${v}%` : '—')}
              />
              <Line
                dataKey="coverage"
                type="monotone"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3, fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Monthly heatmap — rows = years, columns = Jan…Dec, coverage-tinted cells */}
      <ChartCard title="Monthly heatmap" subtitle="Rows = years · columns = Jan → Dec">
        <MonthlyHeatmap stats={stats} currency={currency} />
      </ChartCard>
    </div>
  );
}

function MonthlyHeatmap({
  stats,
  currency,
}: {
  readonly stats: readonly {
    readonly year: number;
    readonly months: ReadonlyMap<number, { paid: number; owed: number }>;
  }[];
  readonly currency: string;
}) {
  if (stats.length === 0) return <EmptyChart message="No history yet." />;
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[64px_repeat(12,1fr)] gap-1 text-[10px] text-muted-foreground">
        <span />
        {Array.from({ length: 12 }, (_, m) => (
          <span key={m} className="text-center uppercase tracking-wider">
            {monthShort(m)}
          </span>
        ))}
      </div>
      {stats.map((y) => (
        <div key={y.year} className="grid grid-cols-[64px_repeat(12,1fr)] items-center gap-1">
          <span className="text-xs font-medium text-foreground tabular-nums">{y.year}</span>
          {Array.from({ length: 12 }, (_, m) => {
            const v = y.months.get(m);
            if (!v || v.owed === 0) {
              return (
                <div
                  key={m}
                  className="aspect-square rounded-sm border border-dashed border-border/40"
                  title={`${monthShort(m)} ${y.year}: no obligations`}
                />
              );
            }
            const coverage = Math.min(1, v.paid / v.owed);
            const percent = Math.round(coverage * 100);
            const bg = heatmapColor(coverage);
            return (
              <div
                key={m}
                className="aspect-square rounded-sm border border-border/40 transition-transform hover:scale-105"
                style={{ background: bg }}
                title={`${monthShort(m)} ${y.year}: ${percent}% (${formatMoney(v.paid, currency)} / ${formatMoney(v.owed, currency)})`}
              >
                <span className="sr-only">
                  {monthShort(m)} {y.year} — {percent}%
                </span>
              </div>
            );
          })}
        </div>
      ))}
      <div className="mt-1 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
        <span>0%</span>
        <div className="flex gap-0.5">
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <div
              key={v}
              className="h-3 w-3 rounded-sm border border-border/40"
              style={{ background: heatmapColor(v) }}
            />
          ))}
        </div>
        <span>100%</span>
      </div>
    </div>
  );
}

function heatmapColor(coverage: number): string {
  // Interpolate from a muted red (low) → sky (mid) → emerald (high)
  // using rgba so the tint reads well in both light + dark themes.
  const pct = Math.max(0, Math.min(1, coverage));
  if (pct < 0.5) {
    // 0.0 → red   (244, 63, 94) ; 0.5 → amber (245, 158, 11)
    const t = pct / 0.5;
    const r = Math.round(244 + (245 - 244) * t);
    const g = Math.round(63 + (158 - 63) * t);
    const b = Math.round(94 + (11 - 94) * t);
    return `rgba(${r},${g},${b},${0.15 + pct * 0.5})`;
  }
  // 0.5 → amber (245, 158, 11) ; 1.0 → emerald (16, 185, 129)
  const t = (pct - 0.5) / 0.5;
  const r = Math.round(245 + (16 - 245) * t);
  const g = Math.round(158 + (185 - 158) * t);
  const b = Math.round(11 + (129 - 11) * t);
  return `rgba(${r},${g},${b},${0.35 + pct * 0.4})`;
}

function monthShort(m: number): string {
  return (
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m] ?? ''
  );
}

// ═══ Reports — scope-body variant ═══════════════════════════════════
//
// For charges where a scope (chapter / batch / branch) owes as a
// collective. Per-member panels (coverage histogram, top payers,
// most behind) don't add value with a single obligor, so the layout
// swaps in:
//   • Party ledger — one card per scope-body with progress bar +
//     paid / owed / remaining.
//   • Period breakdown table — mirrors the leaderboard but keyed to
//     the scope's own period status.
//   • Payment log — chronological list of every payment made against
//     this charge, replacing the "Ranked members" panels.

function ScopeBodyReports(props: MatrixProps) {
  const {
    summary,
    expected,
    collected,
    periods,
    members,
    paymentsByMethod,
    paymentsBySource,
    paymentTiming,
    cumulativeSeries,
    paymentLog,
  } = props;
  const outstanding = Math.max(0, expected - collected);
  const progress = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0;
  const activePeriods = periods.filter((p) => !p.isUpcoming).length;

  // Per-period aggregation for the scope-body period breakdown.
  const periodStats = useMemo(() => {
    return periods
      .filter((p) => !p.isUpcoming)
      .map((p) => {
        const originalIdx = periods.findIndex((pp) => pp.key === p.key);
        let paid = 0;
        let owed = 0;
        for (const m of members) {
          const c = m.cells[originalIdx];
          if (!c) continue;
          paid += c.paid;
          owed += c.owed;
        }
        return {
          key: p.key,
          period: formatPeriodHeader(p),
          Paid: Math.round(paid),
          Outstanding: Math.round(Math.max(0, owed - paid)),
          coverage: owed > 0 ? paid / owed : 0,
          paidMembers: 0,
          totalMembers: 0,
        };
      });
  }, [periods, members]);

  // Per-scope-body summary (paid / owed / remaining). One card each.
  const scopeSummaries = useMemo(() => {
    return members.map((m) => {
      const t = m.cells.reduce(
        (acc, c, idx) => {
          const p = periods[idx];
          if (!c || !p || p.isUpcoming) return acc;
          acc.paid += c.paid;
          acc.owed += c.owed;
          return acc;
        },
        { paid: 0, owed: 0 },
      );
      const outstandingLocal = Math.max(0, t.owed - t.paid);
      const coverage = t.owed > 0 ? Math.min(1, t.paid / t.owed) : 1;
      return {
        id: m.memberId,
        name: m.fullName,
        scopeType: m.scopeType,
        paid: t.paid,
        owed: t.owed,
        outstanding: outstandingLocal,
        coverage,
      };
    });
  }, [members, periods]);

  // Days-since-last helper for the vital signs strip.
  const lastPaymentHint = paymentTiming.lastPaymentAt
    ? relativeDaysAgo(paymentTiming.lastPaymentAt)
    : 'no activity yet';

  return (
    <div className="flex flex-col gap-4">
      {/* Row 1 — headline KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard label="Obligors" value={members.length.toLocaleString()} />
        <StatsCard label="Active periods" value={activePeriods.toLocaleString()} />
        <StatsCard label="Expected" value={formatMoney(expected, summary.currency)} />
        <StatsCard label="Collected" value={formatMoney(collected, summary.currency)} />
        <StatsCard label="Outstanding" value={formatMoney(outstanding, summary.currency)} />
      </div>

      {/* Vital signs — scope-body flavour */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <VitalStat label="Collection rate" value={`${progress}%`} hint="of expected" />
        <VitalStat
          label="Avg. payment"
          value={
            paymentTiming.count > 0 ? formatMoney(paymentTiming.avgAmount, summary.currency) : '—'
          }
          hint={paymentTiming.count > 0 ? `${paymentTiming.count} settled` : 'no payments yet'}
        />
        <VitalStat
          label="Last payment"
          value={paymentTiming.lastPaymentAt ? shortDate(paymentTiming.lastPaymentAt) : '—'}
          hint={lastPaymentHint}
        />
        <VitalStat
          label="Party count"
          value={members.length.toLocaleString()}
          hint="scope obligors on this charge"
        />
      </div>

      <ProgressPanel
        progress={progress}
        collected={collected}
        outstanding={outstanding}
        fullyPaid={scopeSummaries.filter((s) => s.owed > 0 && s.outstanding <= 0.0001).length}
        totalMembers={members.length}
        currency={summary.currency}
      />

      {/* Party ledger — one card per scope-body obligor */}
      <div className="grid gap-3 sm:grid-cols-2">
        {scopeSummaries.map((s) => (
          <PartyLedgerCard
            key={s.id}
            name={s.name}
            scopeType={s.scopeType ?? null}
            paid={s.paid}
            owed={s.owed}
            outstanding={s.outstanding}
            coverage={s.coverage}
            currency={summary.currency}
          />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Cumulative collection" subtitle="Running total over time">
          <CumulativeArea series={cumulativeSeries} currency={summary.currency} />
        </ChartCard>

        <ChartCard title="Period breakdown" subtitle="Paid vs. still owed per cycle">
          {periodStats.length === 0 ? (
            <EmptyChart message="No active periods yet." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={periodStats.slice().reverse()}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis dataKey="period" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => compactNumber(v as number)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={moneyTooltipFormatter(summary.currency)}
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.35 }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, color: 'var(--color-muted-foreground)' }}
                />
                <Bar dataKey="Paid" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Outstanding" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Payment methods" subtitle="Share of collected amount">
          <MethodDonut methods={paymentsByMethod} currency={summary.currency} />
        </ChartCard>

        <ChartCard title="Payment source" subtitle="Auto-generated vs. manually recorded">
          <SourceComposition sources={paymentsBySource} currency={summary.currency} />
        </ChartCard>
      </div>

      {/* Payment log — replaces the ranked-member panels */}
      <PaymentLog rows={paymentLog} currency={summary.currency} />
    </div>
  );
}

// ═══ Reports — pool ═════════════════════════════════════════════════

function PoolReports(props: PoolProps) {
  const {
    summary,
    poolPayments,
    paymentsByMethod,
    paymentsBySource,
    paymentTiming,
    cumulativeSeries,
    collected,
    payerCount,
  } = props;

  const settledPayments = useMemo(() => poolPayments.filter((p) => !p.isReversal), [poolPayments]);
  const reversals = poolPayments.filter((p) => p.isReversal).length;

  const largest = useMemo(
    () => [...settledPayments].sort((a, b) => b.amount - a.amount).slice(0, 5),
    [settledPayments],
  );
  const recent = useMemo(
    () =>
      [...settledPayments]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [settledPayments],
  );

  const dailySeries = useMemo(() => {
    const perDay = new Map<string, number>();
    for (const p of settledPayments) {
      const day = p.createdAt.slice(0, 10);
      perDay.set(day, (perDay.get(day) ?? 0) + p.amount);
    }
    return Array.from(perDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({ date, amount: Math.round(amount) }));
  }, [settledPayments]);

  // Weekly binning — payments and count per ISO-week (Mon start). The
  // count series overlays on the same chart so the reader sees "volume
  // stayed strong even as ticket size fell" without switching cards.
  const weeklySeries = useMemo(() => {
    const perWeek = new Map<string, { amount: number; count: number }>();
    for (const p of settledPayments) {
      const week = weekStartIso(p.createdAt);
      const cur = perWeek.get(week) ?? { amount: 0, count: 0 };
      cur.amount += p.amount;
      cur.count += 1;
      perWeek.set(week, cur);
    }
    return Array.from(perWeek.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, s]) => ({
        week,
        amount: Math.round(s.amount),
        count: s.count,
      }));
  }, [settledPayments]);

  // Payer concentration — how much of the total comes from the top N.
  const topPayerConcentration = useMemo(() => {
    if (settledPayments.length === 0 || collected <= 0) return null;
    const byPayer = new Map<string, number>();
    for (const p of settledPayments) {
      byPayer.set(p.payerLabel, (byPayer.get(p.payerLabel) ?? 0) + p.amount);
    }
    const sorted = Array.from(byPayer.values()).sort((a, b) => b - a);
    const top5 = sorted.slice(0, 5).reduce((a, b) => a + b, 0);
    return Math.round((top5 / collected) * 100);
  }, [settledPayments, collected]);

  // Lorenz-style contributor-concentration curve — X = cumulative %
  // of payers ranked by amount desc, Y = cumulative % of collected.
  // The diagonal represents perfect equality; the steeper the curve
  // rises the more concentrated the giving is in a few big donors.
  const concentrationCurve = useMemo(() => {
    if (settledPayments.length === 0 || collected <= 0) {
      return { points: [] as { payerPct: number; amountPct: number; label: string }[], gini: 0 };
    }
    const byPayer = new Map<string, number>();
    for (const p of settledPayments) {
      byPayer.set(p.payerLabel, (byPayer.get(p.payerLabel) ?? 0) + p.amount);
    }
    const ordered = Array.from(byPayer.entries()).sort((a, b) => b[1] - a[1]);
    const n = ordered.length;
    const points: { payerPct: number; amountPct: number; label: string }[] = [
      { payerPct: 0, amountPct: 0, label: '' },
    ];
    let runningAmt = 0;
    ordered.forEach(([label, amt], idx) => {
      runningAmt += amt;
      points.push({
        payerPct: Math.round(((idx + 1) / n) * 100),
        amountPct: Math.round((runningAmt / collected) * 100),
        label,
      });
    });
    // Gini coefficient — quick summary number for the tooltip / hint.
    let gini = 0;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1]!;
      const p1 = points[i]!;
      gini += ((p1.payerPct - p0.payerPct) * (p0.amountPct + p1.amountPct)) / 2;
    }
    // Gini = 1 - 2 × area-under-curve / 10000 (percent squared).
    const giniIndex = Math.round((1 - (2 * gini) / 10000) * 100);
    return { points, gini: giniIndex };
  }, [settledPayments, collected]);

  const avgPayment = paymentTiming.avgAmount;
  const medianPayment = paymentTiming.medianAmount;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Unique payers" value={payerCount.toLocaleString()} />
        <StatsCard label="Collected" value={formatMoney(collected, summary.currency)} />
        <StatsCard label="Payments" value={poolPayments.length.toLocaleString()} />
        <StatsCard
          label={summary.baseAmount !== null ? 'Unit price' : 'Reversals'}
          value={
            summary.baseAmount !== null
              ? formatMoney(summary.baseAmount, summary.currency)
              : reversals.toLocaleString()
          }
        />
      </div>

      {/* Vital signs strip — pool flavour */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <VitalStat
          label="Avg. payment"
          value={settledPayments.length > 0 ? formatMoney(avgPayment, summary.currency) : '—'}
          hint={
            settledPayments.length > 0
              ? `Median ${formatMoney(medianPayment, summary.currency)}`
              : 'no payments'
          }
        />
        <VitalStat
          label="Last payment"
          value={paymentTiming.lastPaymentAt ? shortDate(paymentTiming.lastPaymentAt) : '—'}
          hint={
            paymentTiming.lastPaymentAt
              ? relativeDaysAgo(paymentTiming.lastPaymentAt)
              : 'no activity yet'
          }
        />
        <VitalStat
          label="Top-5 concentration"
          value={topPayerConcentration !== null ? `${topPayerConcentration}%` : '—'}
          hint="of total collected"
        />
        <VitalStat
          label="Reversal rate"
          value={
            poolPayments.length > 0
              ? `${Math.round((reversals / poolPayments.length) * 100)}%`
              : '—'
          }
          hint={`${reversals} reversal${reversals === 1 ? '' : 's'}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Cumulative collection" subtitle="Running total over time">
          <CumulativeArea series={cumulativeSeries} currency={summary.currency} />
        </ChartCard>

        <ChartCard title="Weekly momentum" subtitle="Amount received per week + payment count">
          {weeklySeries.length === 0 ? (
            <EmptyChart message="No payments yet." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={weeklySeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => shortDate(v as string)}
                />
                <YAxis
                  yAxisId="left"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => compactNumber(v as number)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(l) => `Week of ${shortDate(l as string)}`}
                  formatter={(value, name) => {
                    if (name === 'amount') {
                      return [
                        typeof value === 'number' ? formatMoney(value, summary.currency) : '—',
                        'Amount',
                      ];
                    }
                    return [String(value), 'Payments'];
                  }}
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.35 }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, color: 'var(--color-muted-foreground)' }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="amount"
                  name="Amount"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  dataKey="count"
                  name="Payments"
                  type="monotone"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#f59e0b' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Payment methods" subtitle="Share of collected amount">
          <MethodDonut methods={paymentsByMethod} currency={summary.currency} />
        </ChartCard>

        <ChartCard title="Payment source" subtitle="Auto-generated vs. manually recorded">
          <SourceComposition sources={paymentsBySource} currency={summary.currency} />
        </ChartCard>
      </div>

      {/* Row 3 — contributor concentration + daily activity + rank panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Contributor concentration"
          subtitle={
            concentrationCurve.points.length > 0
              ? `Gini ${concentrationCurve.gini} · steeper = more top-heavy`
              : 'Lorenz curve of payer share'
          }
        >
          <ConcentrationCurve points={concentrationCurve.points} gini={concentrationCurve.gini} />
        </ChartCard>

        <ChartCard title="Daily payments" subtitle="Amount received per day">
          {dailySeries.length === 0 ? (
            <EmptyChart message="No payments yet." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dailySeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => shortDate(v as string)}
                />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => compactNumber(v as number)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={moneyTooltipFormatter(summary.currency)}
                  labelFormatter={(l) => shortDate(l as string)}
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.35 }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RankPanel
          title="Largest payments"
          icon={TrendingUp}
          iconClass="text-emerald-600 dark:text-emerald-400"
          empty="No payments yet."
          rows={largest.map((p) => ({
            id: p.id,
            label: p.payerLabel,
            value: formatMoney(p.amount, summary.currency),
          }))}
        />
        <RankPanel
          title="Most recent"
          icon={Repeat}
          iconClass="text-sky-600 dark:text-sky-400"
          empty="No payments yet."
          rows={recent.map((p) => ({
            id: p.id,
            label: p.payerLabel,
            value: new Date(p.createdAt).toLocaleDateString(),
          }))}
        />
      </div>
    </div>
  );
}

// ═══ Contributor concentration (Lorenz curve) ═══════════════════════

function ConcentrationCurve({
  points,
  gini,
}: {
  readonly points: readonly { payerPct: number; amountPct: number; label: string }[];
  readonly gini: number;
}) {
  if (points.length <= 1) {
    return <EmptyChart message="Need at least one payer to plot." />;
  }
  // Reference diagonal (perfect equality).
  const diagonal = points.map((p) => ({ payerPct: p.payerPct, equality: p.payerPct }));
  const merged = points.map((p, i) => ({ ...p, equality: diagonal[i]?.equality ?? p.payerPct }));

  return (
    <div className="flex h-full flex-col gap-2">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={merged} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="payerPct"
            type="number"
            domain={[0, 100]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            label={{
              value: 'Payers (ranked)',
              position: 'insideBottom',
              offset: -4,
              style: { fill: 'var(--color-muted-foreground)', fontSize: 10 },
            }}
          />
          <YAxis
            dataKey="amountPct"
            type="number"
            domain={[0, 100]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => {
              if (name === 'amountPct')
                return [typeof value === 'number' ? `${value}%` : '—', 'Collected share'];
              return [typeof value === 'number' ? `${value}%` : '—', 'Equality line'];
            }}
            labelFormatter={(l) => `Top ${l}% of payers`}
          />
          <Line
            dataKey="equality"
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
            strokeWidth={1}
            dot={false}
          />
          <Line
            dataKey="amountPct"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: 2, fill: '#8b5cf6' }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-muted-foreground">
        {gini <= 20
          ? 'Payments are spread evenly across contributors.'
          : gini <= 45
            ? 'Some concentration — a handful of larger donors carry a disproportionate share.'
            : 'Heavy concentration — the top few contributors dominate collections.'}
      </p>
    </div>
  );
}

// ═══ Party ledger card (scope-body variant) ═════════════════════════

function PartyLedgerCard({
  name,
  scopeType,
  paid,
  owed,
  outstanding,
  coverage,
  currency,
}: {
  readonly name: string;
  readonly scopeType: string | null;
  readonly paid: number;
  readonly owed: number;
  readonly outstanding: number;
  readonly coverage: number;
  readonly currency: string;
}) {
  const percent = Math.round(coverage * 100);
  const barColor =
    percent >= 100
      ? 'bg-emerald-500'
      : percent >= 70
        ? 'bg-sky-500'
        : percent >= 40
          ? 'bg-amber-500'
          : 'bg-destructive';
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-foreground">{name}</span>
            {scopeType && (
              <span className="text-[11px] italic capitalize text-muted-foreground">
                {scopeType} · as body
              </span>
            )}
          </div>
        </div>
        <span
          className={`text-lg font-semibold tabular-nums ${
            percent >= 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
          }`}
        >
          {percent}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex flex-col">
          <span className="text-muted-foreground">Paid</span>
          <span className="font-medium text-foreground tabular-nums">
            {formatMoney(paid, currency)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">Owed</span>
          <span className="font-medium text-foreground tabular-nums">
            {formatMoney(owed, currency)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">Remaining</span>
          <span
            className={`font-medium tabular-nums ${
              outstanding > 0 ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {outstanding > 0 ? formatMoney(outstanding, currency) : '—'}
          </span>
        </div>
      </div>
    </GradientPanel>
  );
}

// ═══ Payment log (scope-body variant) ═══════════════════════════════

function PaymentLog({
  rows,
  currency,
}: {
  readonly rows: readonly PoolPayment[];
  readonly currency: string;
}) {
  if (rows.length === 0) {
    return (
      <GradientPanel className="flex flex-col gap-3 p-5">
        <span className="text-sm font-medium text-foreground">Payment log</span>
        <p className="text-xs italic text-muted-foreground">
          No payments recorded against this charge yet.
        </p>
      </GradientPanel>
    );
  }
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">Payment log</span>
        <span className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'entry' : 'entries'} · newest first
        </span>
      </div>
      <div className="overflow-hidden rounded-md border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Paid by</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2 text-left font-medium">Method</th>
              <th className="px-3 py-2 text-left font-medium">Source</th>
              <th className="px-3 py-2 text-right font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border/50">
                <td className="px-3 py-2 text-foreground">
                  {p.payerLabel}
                  {p.isReversal && (
                    <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      reversal
                    </span>
                  )}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums ${
                    p.isReversal ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
                  }`}
                >
                  {p.isReversal ? '-' : ''}
                  {formatMoney(p.amount, currency)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{formatMethod(p.method)}</td>
                <td className="px-3 py-2">
                  <Badge
                    variant="outline"
                    className={
                      p.source === 'auto'
                        ? 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                        : 'border-border text-foreground'
                    }
                  >
                    {p.source === 'auto' ? 'Auto' : 'Manual'}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GradientPanel>
  );
}

// ═══ Vital signs (matrix + pool share the shape) ════════════════════

function VitalSignsStrip({
  currency,
  progress,
  timing,
  arpm,
  fullyPaid,
  totalMembers,
  bestPeriodLabel,
  bestPeriodCoverage,
}: {
  readonly currency: string;
  readonly progress: number;
  readonly timing: PaymentTimingStats;
  readonly arpm: number;
  readonly fullyPaid: number;
  readonly totalMembers: number;
  readonly bestPeriodLabel: string;
  readonly bestPeriodCoverage: number | null;
}) {
  const hasPayments = timing.count > 0;
  const compliance = totalMembers > 0 ? Math.round((fullyPaid / totalMembers) * 100) : null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <VitalStat label="Collection rate" value={`${progress}%`} hint="of expected" />
      <VitalStat
        label="Avg. payment"
        value={hasPayments ? formatMoney(timing.avgAmount, currency) : '—'}
        hint={hasPayments ? `Median ${formatMoney(timing.medianAmount, currency)}` : 'no payments'}
      />
      <VitalStat
        label="ARPM"
        value={totalMembers > 0 ? formatMoney(arpm, currency) : '—'}
        hint="avg collected per member"
      />
      <VitalStat
        label="Compliance"
        value={compliance !== null ? `${compliance}%` : '—'}
        hint={`${fullyPaid}/${totalMembers} fully paid`}
      />
      <VitalStat
        label="Best period"
        value={bestPeriodCoverage !== null ? `${Math.round(bestPeriodCoverage)}%` : '—'}
        hint={bestPeriodLabel}
      />
    </div>
  );
}

function VitalStat({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-lg font-semibold text-foreground tabular-nums">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

// ═══ Source composition (Auto vs Manual) ════════════════════════════

function SourceComposition({
  sources,
  currency,
}: {
  readonly sources: readonly PaymentSourceStat[];
  readonly currency: string;
}) {
  if (sources.length === 0) return <EmptyChart message="No payments yet." />;
  const total = sources.reduce((acc, s) => acc + s.amount, 0) || 1;
  const meta: Record<string, { color: string; label: string }> = {
    auto: { color: '#3b82f6', label: 'Auto (member-recorded)' },
    manual: { color: '#f59e0b', label: 'Manual (admin-entered)' },
  };
  return (
    <div className="flex h-full flex-col gap-3">
      {sources.map((s) => {
        const cfg = meta[s.source] ?? { color: '#64748b', label: s.source };
        const pct = (s.amount / total) * 100;
        return (
          <div key={s.source} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: cfg.color }}
                />
                <span className="text-foreground">{cfg.label}</span>
                <span className="text-muted-foreground">
                  · {s.count} payment{s.count === 1 ? '' : 's'}
                </span>
              </span>
              <span className="text-foreground tabular-nums">
                {formatMoney(s.amount, currency)}{' '}
                <span className="text-muted-foreground">({pct.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: cfg.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══ Coverage distribution histogram ════════════════════════════════

function CoverageHistogram({
  data,
}: {
  readonly data: readonly {
    readonly key: string;
    readonly label: string;
    readonly count: number;
  }[];
}) {
  const total = data.reduce((acc, d) => acc + d.count, 0);
  if (total === 0) return <EmptyChart message="No member obligations yet." />;
  const chartData = data.map((d) => ({ ...d }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'var(--color-muted)', opacity: 0.35 }}
          formatter={(v) => (typeof v === 'number' ? `${v} member${v === 1 ? '' : 's'}` : '—')}
        />
        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
          {chartData.map((d) => (
            <Cell
              key={d.key}
              fill={
                d.key === '100'
                  ? '#10b981'
                  : d.key === '75-99'
                    ? '#3b82f6'
                    : d.key === '50-75'
                      ? '#f59e0b'
                      : d.key === '25-50'
                        ? '#f97316'
                        : '#f43f5e'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ═══ Period leaderboard ═════════════════════════════════════════════

interface PeriodLeaderboardRow {
  readonly key: string;
  readonly period: string;
  readonly Paid: number;
  readonly Outstanding: number;
  readonly coverage: number;
  readonly paidMembers: number;
  readonly totalMembers: number;
}

function PeriodLeaderboard({
  rows,
  bestLabel,
  worstLabel,
  bestCoverage,
  worstCoverage,
  currency,
}: {
  readonly rows: readonly PeriodLeaderboardRow[];
  readonly bestLabel: string;
  readonly worstLabel: string;
  readonly bestCoverage: number | null;
  readonly worstCoverage: number | null;
  readonly currency: string;
}) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">Period performance</span>
        <span className="text-xs text-muted-foreground">
          Best <span className="font-medium text-foreground">{bestLabel}</span>
          {bestCoverage !== null && (
            <span className="ml-1 text-emerald-600 dark:text-emerald-400">
              ({Math.round(bestCoverage * 100)}%)
            </span>
          )}
          {' · '}Worst <span className="font-medium text-foreground">{worstLabel}</span>
          {worstCoverage !== null && (
            <span className="ml-1 text-destructive">({Math.round(worstCoverage * 100)}%)</span>
          )}
        </span>
      </div>
      <div className="overflow-hidden rounded-md border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Period</th>
              <th className="px-3 py-2 text-right font-medium">Coverage</th>
              <th className="px-3 py-2 text-right font-medium">Paid</th>
              <th className="px-3 py-2 text-right font-medium">Outstanding</th>
              <th className="px-3 py-2 text-right font-medium">Members paid</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const percent = Math.round(r.coverage * 100);
              return (
                <tr key={r.key} className="border-t border-border/50">
                  <td className="px-3 py-2 font-medium text-foreground">{r.period}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="ml-auto flex w-24 items-center gap-1.5">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${
                            percent >= 100
                              ? 'bg-emerald-500'
                              : percent >= 70
                                ? 'bg-sky-500'
                                : percent >= 40
                                  ? 'bg-amber-500'
                                  : 'bg-destructive'
                          }`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                      <span className="w-9 text-xs tabular-nums text-foreground">{percent}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-foreground tabular-nums">
                    {formatMoney(r.Paid, currency)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      r.Outstanding > 0 ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    {r.Outstanding > 0 ? formatMoney(r.Outstanding, currency) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                    {r.paidMembers}/{r.totalMembers}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GradientPanel>
  );
}

// ═══ Shared chart building blocks ═══════════════════════════════════

function ProgressPanel({
  progress,
  collected,
  outstanding,
  fullyPaid,
  totalMembers,
  currency,
}: {
  readonly progress: number;
  readonly collected: number;
  readonly outstanding: number;
  readonly fullyPaid: number;
  readonly totalMembers: number;
  readonly currency: string;
}) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Collection progress
        </span>
        <span className="text-3xl font-semibold tabular-nums text-foreground">{progress}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
        <div className="flex flex-col">
          <span className="text-muted-foreground">Collected</span>
          <span className="font-medium text-foreground tabular-nums">
            {formatMoney(collected, currency)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">Outstanding</span>
          <span
            className={`font-medium tabular-nums ${
              outstanding > 0 ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {formatMoney(outstanding, currency)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">Fully paid</span>
          <span className="font-medium text-foreground tabular-nums">
            {fullyPaid}/{totalMembers}
          </span>
        </div>
      </div>
    </GradientPanel>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </GradientPanel>
  );
}

function EmptyChart({ message }: { readonly message: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border text-xs italic text-muted-foreground">
      {message}
    </div>
  );
}

function CumulativeArea({
  series,
  currency,
}: {
  readonly series: readonly SeriesPoint[];
  readonly currency: string;
}) {
  if (series.length === 0) return <EmptyChart message="No payments yet." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={series as SeriesPoint[]} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="cum-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => shortDate(v as string)}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => compactNumber(v as number)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={moneyTooltipFormatter(currency)}
          labelFormatter={(l) => shortDate(l as string)}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#cum-fill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MethodDonut({
  methods,
  currency,
}: {
  readonly methods: readonly PaymentMethodStat[];
  readonly currency: string;
}) {
  if (methods.length === 0) return <EmptyChart message="No payments yet." />;
  const total = methods.reduce((acc, m) => acc + m.amount, 0) || 1;
  const chartData = methods.map((m) => ({
    name: formatMethod(m.method),
    value: Math.round(m.amount),
    percent: (m.amount / total) * 100,
    count: m.count,
  }));

  return (
    <div className="flex h-full flex-col gap-2 lg:flex-row lg:items-center">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            innerRadius={45}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            stroke="var(--color-card)"
            strokeWidth={2}
          >
            {chartData.map((_, idx) => (
              <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={moneyTooltipFormatter(currency)} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex flex-col gap-1.5 text-xs">
        {chartData.map((m, idx) => (
          <li key={m.name} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: CHART_PALETTE[idx % CHART_PALETTE.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-foreground">{m.name}</span>
            <span className="text-muted-foreground tabular-nums">{m.percent.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface RankPanelRow {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

function RankPanel({
  title,
  icon: Icon,
  iconClass,
  rows,
  empty,
}: {
  readonly title: string;
  readonly icon: typeof TrendingUp;
  readonly iconClass: string;
  readonly rows: readonly RankPanelRow[];
  readonly empty: string;
}) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className={`h-4 w-4 ${iconClass}`} />
        {title}
      </div>
      {rows.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                  {i + 1}
                </span>
                <span className="truncate text-foreground">{r.label}</span>
              </span>
              <span className="shrink-0 text-xs font-medium text-foreground tabular-nums">
                {r.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </GradientPanel>
  );
}

// ═══ Helpers ════════════════════════════════════════════════════════

const tooltipStyle: React.CSSProperties = {
  background: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--color-popover-foreground)',
};

function formatPeriodHeader(p: MatrixPeriod): string {
  if (!p.periodStart) return 'One-off';
  const d = new Date(p.periodStart);
  if (Number.isNaN(d.getTime())) return p.periodStart;
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function formatRecurrence(recurrence: string, interval: number): string {
  if (recurrence === 'one_time') return 'One-time';
  const label =
    recurrence === 'biannual'
      ? 'half-year'
      : recurrence === 'quarterly'
        ? 'quarter'
        : recurrence === 'yearly'
          ? 'year'
          : recurrence === 'monthly'
            ? 'month'
            : recurrence;
  return interval === 1 ? `Every ${label}` : `Every ${interval} ${label}s`;
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

function formatMoney(amount: number, currency: string): string {
  return `${new Intl.NumberFormat().format(Math.round(amount))} ${currency}`;
}

function compactNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function weekStartIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  // ISO week starts Monday; JS Date.getDay() maps Sunday=0.
  const day = d.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return monday.toISOString().slice(0, 10);
}

function relativeDaysAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (diff <= 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 30) return `${diff} days ago`;
  if (diff < 365) return `${Math.round(diff / 30)}mo ago`;
  return `${Math.round(diff / 365)}y ago`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '—';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

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
  const ts = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${baseName}-${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
