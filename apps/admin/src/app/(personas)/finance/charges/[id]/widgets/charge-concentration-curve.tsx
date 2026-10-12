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
import { ChargeEmptyChart } from './charge-chart-card';

/**
 * Lorenz-curve contributor-concentration chart with a dashed equality
 * diagonal. X = cumulative % of payers ranked amount-desc, Y =
 * cumulative % of collected. Copy underneath reads the gini index
 * ("Payments are spread evenly" / "some concentration" / "heavy
 * concentration") so the operator doesn't have to interpret the
 * curve themselves.
 */
export function ChargeConcentrationCurve({
  points,
  gini,
}: {
  readonly points: readonly { payerPct: number; amountPct: number; label: string }[];
  readonly gini: number;
}) {
  if (points.length <= 1) {
    return <ChargeEmptyChart message="Need at least one payer to plot." />;
  }
  // Reference diagonal (perfect equality).
  const diagonal = points.map((p) => ({ payerPct: p.payerPct, equality: p.payerPct }));
  const merged = points.map((p, i) => ({ ...p, equality: diagonal[i]?.equality ?? p.payerPct }));

  return (
    <div className="flex h-full flex-col gap-2">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={merged} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="payerPct"
            type="number"
            domain={[0, 100]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            label={{
              value: 'Payers (ranked)',
              position: 'insideBottom',
              offset: -4,
              style: { fill: 'var(--color-muted-foreground)', fontSize: 10 },
            }}
          />
          <YAxis
            dataKey="amountPct"
            type="number"
            domain={[0, 100]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => {
              if (name === 'amountPct')
                return [typeof value === 'number' ? `${value}%` : '—', 'Collected share'];
              return [typeof value === 'number' ? `${value}%` : '—', 'Equality line'];
            }}
            labelFormatter={(l) => `Top ${l}% of payers`}
          />
          <Line
            dataKey="equality"
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
            strokeWidth={1}
            dot={false}
          />
          <Line
            dataKey="amountPct"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: 2, fill: '#8b5cf6' }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-muted-foreground">
        {gini <= 20
          ? 'Payments are spread evenly across contributors.'
          : gini <= 45
            ? 'Some concentration — a handful of larger donors carry a disproportionate share.'
            : 'Heavy concentration — the top few contributors dominate collections.'}
      </p>
    </div>
  );
}
