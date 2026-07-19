import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { AXIS_TICK, moneyTooltipFormatter, tooltipStyle } from './charge-detail-constants';
import { ChargeEmptyChart } from './charge-chart-card';
import type { SeriesPoint } from './charge-detail-types';
import { compactNumber, shortDate } from './shared-formatters';

/**
 * Cumulative-collection area chart — running total over time. Used
 * inside every reports flavour's "Cumulative collection" card.
 * `SeriesPoint.cumulative` is the y-value; `daily` is not plotted
 * here (the pool report has a separate daily-bars card).
 */
export function ChargeCumulativeArea({
  series,
  currency,
}: {
  readonly series: readonly SeriesPoint[];
  readonly currency: string;
}) {
  if (series.length === 0) return <ChargeEmptyChart message="No payments yet." />;
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
