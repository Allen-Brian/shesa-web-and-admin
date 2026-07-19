import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import { formatAmount, formatRelative } from './treasury-landing-helpers';
import type { RecentEntry } from './treasury-landing-types';

/**
 * Cross-treasury movement feed below the landing grid. Each row
 * links to the scope's statement so the operator can drill into any
 * movement in one click. Reversals get the amber pill so the total
 * doesn't accidentally read as a normal movement.
 */
export function TreasuryRecentActivity({ entries }: { readonly entries: readonly RecentEntry[] }) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">Recent activity</span>
        <span className="text-xs text-muted-foreground">
          {entries.length} most recent movement{entries.length === 1 ? '' : 's'} · click a scope to
          open its statement
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-border/50">
        {entries.map((e) => {
          const isIncome = e.direction === 'income';
          const Icon = isIncome ? ArrowUpRight : ArrowDownRight;
          const tone = isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive';
          const scopeHref = e.scopeSlug ? `/finance/treasury/${e.scopeSlug}` : null;
          return (
            <li
              key={e.id}
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
                  {e.counterparty}
                  {e.isReversal && (
                    <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      reversal
                    </span>
                  )}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {scopeHref ? (
                    <Link href={scopeHref} className="hover:text-foreground hover:underline">
                      {e.scopeName}
                    </Link>
                  ) : (
                    e.scopeName
                  )}
                  {e.memo && <> · {e.memo}</>}
                </span>
              </div>
              <div className="ml-auto flex flex-col items-end leading-tight">
                <span className={`text-sm font-medium tabular-nums ${tone}`}>
                  {isIncome ? '+' : '−'}
                  {formatAmount(e.amount)} {e.currency}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatRelative(e.createdAt)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </GradientPanel>
  );
}
