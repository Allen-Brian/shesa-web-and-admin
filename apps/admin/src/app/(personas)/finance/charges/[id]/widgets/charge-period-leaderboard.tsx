import { GradientPanel } from '@shesa/ui';

import type { PeriodStatsRow } from './charge-detail-types';
import { formatMoney } from './shared-formatters';

/**
 * Best/worst-coverage subtitle + full period table. Sorted best-first
 * (the ScopeBody + Matrix reports flip this before passing in). The
 * mini coverage bar per row matches the CoverageBar in the matrix
 * table so operators can eyeball the same colours consistently.
 */
export function ChargePeriodLeaderboard({
  rows,
  bestLabel,
  worstLabel,
  bestCoverage,
  worstCoverage,
  currency,
}: {
  readonly rows: readonly PeriodStatsRow[];
  readonly bestLabel: string;
  readonly worstLabel: string;
  readonly bestCoverage: number | null;
  readonly worstCoverage: number | null;
  readonly currency: string;
}) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">Period performance</span>
        <span className="text-xs text-muted-foreground">
          Best <span className="font-medium text-foreground">{bestLabel}</span>
          {bestCoverage !== null && (
            <span className="ml-1 text-emerald-600 dark:text-emerald-400">
              ({Math.round(bestCoverage * 100)}%)
            </span>
          )}
          {' · '}Worst <span className="font-medium text-foreground">{worstLabel}</span>
          {worstCoverage !== null && (
            <span className="ml-1 text-destructive">({Math.round(worstCoverage * 100)}%)</span>
          )}
        </span>
      </div>
      <div className="overflow-hidden rounded-md border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Period</th>
              <th className="px-3 py-2 text-right font-medium">Coverage</th>
              <th className="px-3 py-2 text-right font-medium">Paid</th>
              <th className="px-3 py-2 text-right font-medium">Outstanding</th>
              <th className="px-3 py-2 text-right font-medium">Members paid</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const percent = Math.round(r.coverage * 100);
              return (
                <tr key={r.key} className="border-t border-border/50">
                  <td className="px-3 py-2 font-medium text-foreground">{r.period}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="ml-auto flex w-24 items-center gap-1.5">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${
                            percent >= 100
                              ? 'bg-emerald-500'
                              : percent >= 70
                                ? 'bg-sky-500'
                                : percent >= 40
                                  ? 'bg-amber-500'
                                  : 'bg-destructive'
                          }`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                      <span className="w-9 text-xs tabular-nums text-foreground">{percent}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-foreground tabular-nums">
                    {formatMoney(r.Paid, currency)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      r.Outstanding > 0 ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    {r.Outstanding > 0 ? formatMoney(r.Outstanding, currency) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                    {r.paidMembers}/{r.totalMembers}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GradientPanel>
  );
}
