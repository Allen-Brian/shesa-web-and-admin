'use client';

import type { SerialRow } from './obligation-widget-types';

/**
 * Compact paid/total bar for the Progress column. Uses the payment ratio
 * to choose bar colour: destructive → amber → sky → emerald as we cross
 * 40/70/100%.
 */
export function ProgressCell({ row }: { readonly row: SerialRow }) {
  const percent = row.amount > 0 ? Math.min(100, Math.round((row.paid / row.amount) * 100)) : 0;
  const barColor =
    percent >= 100
      ? 'bg-emerald-500'
      : percent >= 70
        ? 'bg-sky-500'
        : percent >= 40
          ? 'bg-amber-500'
          : 'bg-destructive';
  return (
    <div className="flex w-full flex-col gap-1 py-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground tabular-nums">
          {new Intl.NumberFormat().format(Math.round(row.paid))} {row.currency}
        </span>
        <span className="text-muted-foreground tabular-nums">
          of {new Intl.NumberFormat().format(Math.round(row.amount))}
          <span
            className={`ml-1 font-medium ${
              percent >= 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
            }`}
          >
            · {percent}%
          </span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
