import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { GradientPanel } from '@shesa/ui';

import { AXIS_TICK, compactNumber, formatMoney, tooltipStyle } from './reports-formatters';

/**
 * Titled bar-chart card used by the collections / arrears / donations
 * insight strips. Bars are amount-typed so tooltip formatting is
 * money-shaped by default; the `barFill` prop lets each insight
 * choose a semantic colour (destructive red for arrears, violet for
 * donations, blue for everything else).
 */
export function ReportBarChartPanel({
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
      <span className="text-base font-semibold text-foreground">{title}</span>
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
