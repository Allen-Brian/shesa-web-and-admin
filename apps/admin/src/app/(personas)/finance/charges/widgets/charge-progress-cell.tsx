import { Users } from 'lucide-react';

import type { SerialRow } from './charges-types';

/**
 * "Progress" column cell — collected vs expected + percent + a slim
 * horizontal bar. Colour ramps red → amber → sky → emerald as
 * coverage rises. Charges without generated obligations show a "no
 * obligations yet" placeholder instead of "0%" to avoid reading as a
 * problem.
 */
export function ChargeProgressCell({ row }: { readonly row: SerialRow }) {
  const hasObligations = row.expected > 0;
  const percent = hasObligations
    ? Math.min(100, Math.round((row.collected / row.expected) * 100))
    : null;
  const barColor =
    percent === null
      ? 'bg-muted-foreground/40'
      : percent >= 100
        ? 'bg-emerald-500'
        : percent >= 70
          ? 'bg-sky-500'
          : percent >= 40
            ? 'bg-amber-500'
            : 'bg-destructive';
  return (
    <div className="flex w-full flex-col gap-1 py-1">
      <div className="flex items-center justify-between text-xs">
        {hasObligations ? (
          <>
            <span className="text-foreground tabular-nums">
              {new Intl.NumberFormat().format(Math.round(row.collected))} {row.currency}
            </span>
            <span className="text-muted-foreground tabular-nums">
              of {new Intl.NumberFormat().format(Math.round(row.expected))}
              {percent !== null && (
                <span
                  className={`ml-1 font-medium ${
                    percent >= 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
                  }`}
                >
                  · {percent}%
                </span>
              )}
            </span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs italic text-muted-foreground">
            <Users className="h-3 w-3" />
            no obligations yet
          </span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent ?? 0}%` }} />
      </div>
    </div>
  );
}
