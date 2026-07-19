import { ChargeEmptyChart } from './charge-chart-card';
import type { PaymentSourceStat } from './charge-detail-types';
import { formatMoney } from './shared-formatters';

/**
 * Bar-per-source composition — "Auto (member-recorded)" vs "Manual
 * (admin-entered)" split by amount. Rendered as stacked horizontal
 * bars because the count is small (usually 2) and a donut would
 * dominate the card.
 */
export function ChargeSourceComposition({
  sources,
  currency,
}: {
  readonly sources: readonly PaymentSourceStat[];
  readonly currency: string;
}) {
  if (sources.length === 0) return <ChargeEmptyChart message="No payments yet." />;
  const total = sources.reduce((acc, s) => acc + s.amount, 0) || 1;
  const meta: Record<string, { color: string; label: string }> = {
    auto: { color: '#3b82f6', label: 'Auto (member-recorded)' },
    manual: { color: '#f59e0b', label: 'Manual (admin-entered)' },
  };
  return (
    <div className="flex h-full flex-col gap-3">
      {sources.map((s) => {
        const cfg = meta[s.source] ?? { color: '#64748b', label: s.source };
        const pct = (s.amount / total) * 100;
        return (
          <div key={s.source} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: cfg.color }}
                />
                <span className="text-foreground">{cfg.label}</span>
                <span className="text-muted-foreground">
                  · {s.count} payment{s.count === 1 ? '' : 's'}
                </span>
              </span>
              <span className="text-foreground tabular-nums">
                {formatMoney(s.amount, currency)}{' '}
                <span className="text-muted-foreground">({pct.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: cfg.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
