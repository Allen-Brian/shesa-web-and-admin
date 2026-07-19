import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { CHART_PALETTE, moneyTooltipFormatter, tooltipStyle } from './charge-detail-constants';
import { ChargeEmptyChart } from './charge-chart-card';
import type { PaymentMethodStat } from './charge-detail-types';
import { formatMethod } from './shared-formatters';

/**
 * Donut chart of paid amount split by payment method (Cash / MoMo /
 * Bank / Card / …). Legend list on the right doubles as the label
 * cluster since Recharts labels around a donut get cramped.
 */
export function ChargeMethodDonut({
  methods,
  currency,
}: {
  readonly methods: readonly PaymentMethodStat[];
  readonly currency: string;
}) {
  if (methods.length === 0) return <ChargeEmptyChart message="No payments yet." />;
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
