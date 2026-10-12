'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { GradientPanel } from '@shesa/ui';

import { formatCompact, formatMoney } from '@/lib/finance/format-money';

import type { DayPoint, NamedValue } from './group-report-types';

/**
 * The chart vocabulary for the group dashboard.
 *
 * Four forms, each picked for the question it answers rather than for
 * variety: an area for "how did this build up over time", vertical
 * bars for "which days were busy", horizontal bars for "which of these
 * named things is biggest" (horizontal because charge names are long
 * and a rotated axis label is a small punishment for reading), and a
 * donut only where the parts genuinely sum to a meaningful whole.
 *
 * Money axes are abbreviated (`1.2M`) and tooltips carry the full
 * figure. A y-axis of nine-digit CFA numbers eats a third of the panel
 * and is read as a shape anyway.
 */

const INCOME = '#10b981';
const SPEND = '#f59e0b';
const NET = '#3b82f6';

const PALETTE = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#f43f5e',
  '#06b6d4',
  '#f97316',
  '#64748b',
];

const AXIS_TICK = { fill: 'var(--color-muted-foreground)', fontSize: 13 } as const;

const tooltipStyle: React.CSSProperties = {
  background: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 14,
  color: 'var(--color-popover-foreground)',
};

/** `'2026-03-14'` → `'14 Mar'`. */
function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <GradientPanel className={`flex flex-col gap-3 p-5 ${className ?? ''}`}>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </GradientPanel>
  );
}

export function EmptyChart({ message }: { readonly message: string }) {
  return (
    <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-border px-6 text-center text-sm italic text-muted-foreground">
      {message}
    </div>
  );
}

/**
 * The headline chart: money in building up day by day, with the net
 * line — income less spend — riding on top of it.
 *
 * Two series rather than one because the gap between them is the
 * story. A group that raised eight million and spent seven and a half
 * looks identical to one that raised eight and spent nothing, until
 * the net line is drawn against the income area.
 */
export function CumulativeCurve({
  series,
  currency,
}: {
  readonly series: readonly DayPoint[];
  readonly currency: string;
}) {
  if (series.length === 0) {
    return <EmptyChart message="No money has moved in this group yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={series as DayPoint[]} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="group-income-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INCOME} stopOpacity={0.35} />
            <stop offset="100%" stopColor={INCOME} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => shortDate(v as string)}
          minTickGap={24}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(v) => formatCompact(v as number)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(l) => shortDate(l as string)}
          formatter={(v, name) => [
            typeof v === 'number' ? formatMoney(v, currency) : '—',
            name === 'cumulativeIncome' ? 'Raised so far' : 'Net so far',
          ]}
        />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="plainline"
          formatter={(v) => (
            <span className="text-sm text-muted-foreground">
              {v === 'cumulativeIncome' ? 'Raised so far' : 'Net after spending'}
            </span>
          )}
        />
        <Area
          type="monotone"
          dataKey="cumulativeIncome"
          stroke={INCOME}
          strokeWidth={2}
          fill="url(#group-income-fill)"
        />
        <Line type="monotone" dataKey="cumulativeNet" stroke={NET} strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Money in and money out, side by side, on each day that saw activity. */
export function DailyBars({
  series,
  currency,
}: {
  readonly series: readonly DayPoint[];
  readonly currency: string;
}) {
  if (series.length === 0) return <EmptyChart message="Nothing to plot yet." />;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={series as DayPoint[]} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => shortDate(v as string)}
          minTickGap={20}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(v) => formatCompact(v as number)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
          labelFormatter={(l) => shortDate(l as string)}
          formatter={(v, name) => [
            typeof v === 'number' ? formatMoney(v, currency) : '—',
            name === 'income' ? 'Money in' : 'Money out',
          ]}
        />
        <Legend
          verticalAlign="top"
          height={28}
          formatter={(v) => (
            <span className="text-sm text-muted-foreground">
              {v === 'income' ? 'Money in' : 'Money out'}
            </span>
          )}
        />
        <Bar dataKey="income" fill={INCOME} radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expense" fill={SPEND} radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Ranked horizontal bars. Used wherever the answer is "this one, then
 * this one" — charges, expense categories — and the labels are names
 * that have to stay readable.
 */
export function RankedBars({
  data,
  currency,
  fill = NET,
  emptyMessage,
}: {
  readonly data: readonly NamedValue[];
  readonly currency: string;
  readonly fill?: string;
  readonly emptyMessage: string;
}) {
  if (data.length === 0) return <EmptyChart message={emptyMessage} />;

  const top = data.slice(0, 8);
  // Enough room per bar to breathe, with a floor so a single-bar chart
  // does not collapse into a stripe.
  const height = Math.max(160, top.length * 38 + 24);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={top as NamedValue[]}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
      >
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCompact(v as number)}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={130}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
          formatter={(v) => (typeof v === 'number' ? formatMoney(v, currency) : '—')}
        />
        <Bar dataKey="value" fill={fill} radius={[0, 4, 4, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Share-of-whole donut with a legend that carries the figure as well
 * as the percentage — the percentage answers "how much of it", the
 * figure answers "how much", and a committee always asks both.
 */
export function SharePie({
  data,
  currency,
  emptyMessage,
}: {
  readonly data: readonly NamedValue[];
  readonly currency: string;
  readonly emptyMessage: string;
}) {
  if (data.length === 0) return <EmptyChart message={emptyMessage} />;

  const total = data.reduce((a, b) => a + b.value, 0) || 1;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie
              data={data as NamedValue[]}
              dataKey="value"
              innerRadius={52}
              outerRadius={88}
              paddingAngle={2}
              stroke="var(--color-card)"
              strokeWidth={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v) => (typeof v === 'number' ? formatMoney(v, currency) : '—')}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col gap-2 text-sm lg:min-w-60">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: PALETTE[i % PALETTE.length] }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-foreground">{d.name}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatCompact(d.value)}
            </span>
            <span className="w-9 shrink-0 text-right font-medium tabular-nums text-foreground">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
