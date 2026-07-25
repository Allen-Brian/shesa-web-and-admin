import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { AXIS_TICK, tooltipStyle } from './charge-detail-constants';

/**
 * "Seasonal coverage" line — average coverage per calendar month
 * across every year in the yearly-analysis dataset. Y-axis fixed to
 * 0-100 so the seasonal shape is comparable across charges.
 */
export function ChargeSeasonalLine({
  data,
}: {
  readonly data: readonly { readonly label: string; readonly coverage: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart
        data={data as { label: string; coverage: number }[]}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
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
  );
}
