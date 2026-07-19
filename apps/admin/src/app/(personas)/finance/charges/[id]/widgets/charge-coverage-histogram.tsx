import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { AXIS_TICK, tooltipStyle } from './charge-detail-constants';
import { ChargeEmptyChart } from './charge-chart-card';

/**
 * Members-per-coverage-bucket histogram. Buckets fixed at 0 / 1–25 /
 * 25–50 / 50–75 / 75–99 / 100 percent so the reader can compare
 * across charges. Bars tinted red → orange → amber → sky → blue →
 * emerald as coverage rises.
 */
export function ChargeCoverageHistogram({
  data,
}: {
  readonly data: readonly {
    readonly key: string;
    readonly label: string;
    readonly count: number;
  }[];
}) {
  const total = data.reduce((acc, d) => acc + d.count, 0);
  if (total === 0) return <ChargeEmptyChart message="No member obligations yet." />;
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
