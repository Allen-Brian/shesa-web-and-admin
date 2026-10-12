import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { AXIS_TICK, moneyTooltipFormatter, tooltipStyle } from './charge-detail-constants';
import { ChargeEmptyChart } from './charge-chart-card';
import { compactNumber, shortDate } from './shared-formatters';

/**
 * Simple bar-per-day amount chart for the pool reports. The pool
 * flavour already has a weekly-momentum chart above; this one is
 * finer-grained so operators can spot which specific day a spike
 * came in on.
 */
export function ChargeDailyPaymentsBar({
  data,
  currency,
}: {
  readonly data: readonly { readonly date: string; readonly amount: number }[];
  readonly currency: string;
}) {
  if (data.length === 0) return <ChargeEmptyChart message="No payments yet." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
          cursor={{ fill: 'var(--color-muted)', opacity: 0.35 }}
        />
        <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
