import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { AXIS_TICK, tooltipStyle } from './charge-detail-constants';
import { ChargeEmptyChart } from './charge-chart-card';
import { compactNumber, formatMoney, shortDate } from './shared-formatters';

/**
 * Pool-reports weekly momentum chart — amount received per ISO week
 * (bars, left axis) overlaid with payment count (line, right axis).
 * Composed so the reader can spot cases where volume held steady
 * even as ticket size fell (or vice versa).
 */
export function ChargeWeeklyMomentumChart({
  data,
  currency,
}: {
  readonly data: readonly {
    readonly week: string;
    readonly amount: number;
    readonly count: number;
  }[];
  readonly currency: string;
}) {
  if (data.length === 0) return <ChargeEmptyChart message="No payments yet." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
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
              return [typeof value === 'number' ? formatMoney(value, currency) : '—', 'Amount'];
            }
            return [String(value), 'Payments'];
          }}
          cursor={{ fill: 'var(--color-muted)', opacity: 0.35 }}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 11, color: 'var(--color-muted-foreground)' }}
        />
        <Bar yAxisId="left" dataKey="amount" name="Amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
  );
}
