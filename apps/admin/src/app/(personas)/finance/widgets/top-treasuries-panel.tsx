import Link from 'next/link';
import { ArrowRight, Wallet } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import { formatMoney } from './dashboard-formatters';
import type { ScopeRow, TreasuryRow } from './dashboard-types';
import { EmptyInline } from './empty-inline';

interface TopTreasuriesPanelProps {
  readonly treasuries: readonly TreasuryRow[];
  readonly scopeById: ReadonlyMap<string, ScopeRow>;
}

/**
 * Top-N treasuries by balance. Empty state doubles as onboarding
 * copy — if the caller can't see any treasuries the panel points them
 * at the missing `treasury.read` grant instead of leaving them
 * staring at a blank card.
 */
export function TopTreasuriesPanel({ treasuries, scopeById }: TopTreasuriesPanelProps) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">Top treasuries</span>
        <Link
          href="/finance/treasury"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {treasuries.length === 0 ? (
        <EmptyInline label="No treasuries in view. Ask an admin to grant treasury.read at a scope you should see." />
      ) : (
        <ul className="flex flex-col divide-y divide-border/50">
          {treasuries.map((t) => {
            const scope = scopeById.get(t.scope_id);
            const balance = parseFloat(t.balance);
            const href = scope?.slug ? `/finance/treasury/${scope.slug}` : '#';
            return (
              <li key={t.scope_id} className="py-2.5 first:pt-0 last:pb-0">
                <Link href={href} className="flex items-center justify-between gap-3 group">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                        {scope?.name ?? '(unknown scope)'}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground capitalize">
                        {scope?.scope_type ?? '—'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      balance < 0 ? 'text-destructive' : 'text-foreground'
                    }`}
                  >
                    {formatMoney(balance, t.currency)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </GradientPanel>
  );
}
