import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

/**
 * Semi-circular thermometer gauge for the goal-shape hero. Uses two
 * Recharts Cells (raised + remaining) with a half-donut cx/cy so the
 * arc reads as a rising thermometer rather than a full pie. The big
 * percentage sits inside the arc, positioned via absolute overlay.
 */
export function ChargeGoalThermometer({
  percent,
  complete,
}: {
  readonly percent: number;
  readonly complete: boolean;
}) {
  return (
    <div className="relative flex h-40 w-full max-w-70 shrink-0 items-end self-center lg:self-auto">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={[
              { name: 'Raised', value: Math.max(0.0001, percent) },
              { name: 'Remaining', value: Math.max(0.0001, 100 - percent) },
            ]}
            cx="50%"
            cy="90%"
            startAngle={180}
            endAngle={0}
            innerRadius={70}
            outerRadius={110}
            paddingAngle={complete ? 0 : 1}
            dataKey="value"
            stroke="var(--color-card)"
            strokeWidth={2}
          >
            <Cell fill={complete ? '#10b981' : '#3b82f6'} />
            <Cell fill="var(--color-muted)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-3">
        <span
          className={`text-4xl font-semibold tabular-nums ${
            complete ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
          }`}
        >
          {Math.round(percent)}%
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">of goal</span>
      </div>
    </div>
  );
}
