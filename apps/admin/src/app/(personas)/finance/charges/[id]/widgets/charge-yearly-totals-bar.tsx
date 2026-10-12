import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { AXIS_TICK, moneyTooltipFormatter, tooltipStyle } from './charge-detail-constants';
import { ChargeEmptyChart } from './charge-chart-card';
import { compactNumber } from './shared-formatters';

/**
 * "Yearly totals" bar chart on the yearly-analysis card — one column
 * per year with a Collected + Outstanding stack. Same colour /
 * radius language as the collection-by-period bar so the reader
 * doesn't relearn the legend when switching scales.
 */
export function ChargeYearlyTotalsBar({
  data,
  currency,
}: {
  readonly data: readonly {
    readonly year: string;
    readonly Collected: number;
    readonly Outstanding: number;
  }[];
  readonly currency: string;
}) {
  if (data.length === 0) return <ChargeEmptyChart message="No history yet." />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
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
  );
}
