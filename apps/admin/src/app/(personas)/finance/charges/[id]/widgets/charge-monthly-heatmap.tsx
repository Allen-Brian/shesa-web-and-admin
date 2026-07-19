import { ChargeEmptyChart } from './charge-chart-card';
import { formatMoney } from './shared-formatters';

/**
 * Rows-are-years, columns-are-months coverage heatmap. Cell tint
 * ramps red → amber → emerald as coverage rises; empty cells (no
 * obligations that month) render dashed instead of red so operators
 * don't misread absence-of-data as "0% coverage".
 */
export function ChargeMonthlyHeatmap({
  stats,
  currency,
}: {
  readonly stats: readonly {
    readonly year: number;
    readonly months: ReadonlyMap<number, { paid: number; owed: number }>;
  }[];
  readonly currency: string;
}) {
  if (stats.length === 0) return <ChargeEmptyChart message="No history yet." />;
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[64px_repeat(12,1fr)] gap-1 text-[10px] text-muted-foreground">
        <span />
        {Array.from({ length: 12 }, (_, m) => (
          <span key={m} className="text-center uppercase tracking-wider">
            {chargeMonthShort(m)}
          </span>
        ))}
      </div>
      {stats.map((y) => (
        <div key={y.year} className="grid grid-cols-[64px_repeat(12,1fr)] items-center gap-1">
          <span className="text-xs font-medium text-foreground tabular-nums">{y.year}</span>
          {Array.from({ length: 12 }, (_, m) => {
            const v = y.months.get(m);
            if (!v || v.owed === 0) {
              return (
                <div
                  key={m}
                  className="aspect-square rounded-sm border border-dashed border-border/40"
                  title={`${chargeMonthShort(m)} ${y.year}: no obligations`}
                />
              );
            }
            const coverage = Math.min(1, v.paid / v.owed);
            const percent = Math.round(coverage * 100);
            const bg = chargeHeatmapColor(coverage);
            return (
              <div
                key={m}
                className="aspect-square rounded-sm border border-border/40 transition-transform hover:scale-105"
                style={{ background: bg }}
                title={`${chargeMonthShort(m)} ${y.year}: ${percent}% (${formatMoney(v.paid, currency)} / ${formatMoney(v.owed, currency)})`}
              >
                <span className="sr-only">
                  {chargeMonthShort(m)} {y.year} — {percent}%
                </span>
              </div>
            );
          })}
        </div>
      ))}
      <div className="mt-1 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
        <span>0%</span>
        <div className="flex gap-0.5">
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <div
              key={v}
              className="h-3 w-3 rounded-sm border border-border/40"
              style={{ background: chargeHeatmapColor(v) }}
            />
          ))}
        </div>
        <span>100%</span>
      </div>
    </div>
  );
}

/**
 * Coverage → rgba() colour helper. Interpolates in two segments:
 * red (0%) → amber (50%) → emerald (100%). Opacity also rises with
 * coverage so low-value cells fade back rather than shouting red at
 * the reader.
 */
export function chargeHeatmapColor(coverage: number): string {
  const pct = Math.max(0, Math.min(1, coverage));
  if (pct < 0.5) {
    // 0.0 → red   (244, 63, 94) ; 0.5 → amber (245, 158, 11)
    const t = pct / 0.5;
    const r = Math.round(244 + (245 - 244) * t);
    const g = Math.round(63 + (158 - 63) * t);
    const b = Math.round(94 + (11 - 94) * t);
    return `rgba(${r},${g},${b},${0.15 + pct * 0.5})`;
  }
  // 0.5 → amber (245, 158, 11) ; 1.0 → emerald (16, 185, 129)
  const t = (pct - 0.5) / 0.5;
  const r = Math.round(245 + (16 - 245) * t);
  const g = Math.round(158 + (185 - 158) * t);
  const b = Math.round(11 + (129 - 11) * t);
  return `rgba(${r},${g},${b},${0.35 + pct * 0.4})`;
}

/** "Jan" … "Dec" — the same short month labels used across the file. */
export function chargeMonthShort(m: number): string {
  return (
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m] ?? ''
  );
}
