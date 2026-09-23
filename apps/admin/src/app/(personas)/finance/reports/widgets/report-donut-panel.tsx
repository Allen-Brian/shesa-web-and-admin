import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { GradientPanel } from '@shesa/ui';

import { CHART_PALETTE, formatMoney, tooltipStyle } from './reports-formatters';

/**
 * Donut card with a labelled legend column beside it. Used by the
 * payment-methods and expenses-by-category insight strips — both are
 * "what share of the total does each row hold" questions where a
 * donut reads more quickly than a bar chart. Legend on the right so
 * long labels don't clip the arc.
 */
export function ReportDonutPanel({
  title,
  data,
  currency,
}: {
  readonly title: string;
  readonly data: readonly { name: string; value: number; count: number }[];
  readonly currency: string;
}) {
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <GradientPanel className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center">
      <div className="flex-1">
        <span className="mb-2 block text-base font-semibold text-foreground">{title}</span>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data as unknown as { name: string; value: number }[]}
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              stroke="var(--color-card)"
              strokeWidth={2}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v) => (typeof v === 'number' ? formatMoney(v, currency) : '—')}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col gap-2 text-sm lg:min-w-56">
        {data.map((d, idx) => {
          const pct = (d.value / total) * 100;
          return (
            <li key={d.name} className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: CHART_PALETTE[idx % CHART_PALETTE.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-foreground">{d.name}</span>
              <span className="text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
            </li>
          );
        })}
      </ul>
    </GradientPanel>
  );
}
