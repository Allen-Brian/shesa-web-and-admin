import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import { formatMoney } from '@/lib/finance/format-money';
import { formatRelativeLong } from '@/lib/format/relative-time';
import type { DashboardActivity } from './dashboard-types';
import { EmptyInline } from '@/components/dashboard/empty-inline';

/**
 * Mixed payments + expenses feed for the dashboard's operational
 * radar. Rows are colour-coded by direction (green = income, red =
 * expense); reversals get an inline amber pill so the total doesn't
 * accidentally read as a normal movement.
 */
export function RecentActivityPanel({
  activity,
}: {
  readonly activity: readonly DashboardActivity[];
}) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">Recent activity</span>
        <span className="text-xs text-muted-foreground">
          {activity.length} most recent movement{activity.length === 1 ? '' : 's'}
        </span>
      </div>
      {activity.length === 0 ? (
        <EmptyInline label="No ledger activity yet in the last 30 days." />
      ) : (
        <ul className="flex flex-col divide-y divide-border/50">
          {activity.map((a) => {
            const isIncome = a.direction === 'income';
            const Icon = isIncome ? ArrowUpRight : ArrowDownRight;
            const tone = isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive';
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isIncome ? 'bg-emerald-500/10' : 'bg-destructive/10'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${tone}`} />
                </div>
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium text-foreground">
                    {a.counterparty}
                    {a.isReversal && (
                      <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        reversal
                      </span>
                    )}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">{a.scopeName}</span>
                </div>
                <div className="ml-auto flex flex-col items-end leading-tight">
                  <span className={`text-sm font-medium tabular-nums ${tone}`}>
                    {isIncome ? '+' : '−'}
                    {formatMoney(a.amount, a.currency)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelativeLong(a.when)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </GradientPanel>
  );
}
