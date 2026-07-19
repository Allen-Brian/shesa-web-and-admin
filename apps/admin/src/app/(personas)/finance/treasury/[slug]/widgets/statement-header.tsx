import Link from 'next/link';
import { ArrowLeft, Building2, Wallet } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

/**
 * Statement page header — back link, scope avatar + name + scope-type
 * chip on the left, live-balance headline on the right. Live balance
 * turns destructive-red when negative so the operator spots an
 * overdrawn treasury without reading digits.
 */
export function StatementHeader({
  scopeName,
  scopeType,
  liveBalance,
  liveUpdatedAt,
  currency,
}: {
  readonly scopeName: string;
  readonly scopeType: string;
  readonly liveBalance: number;
  readonly liveUpdatedAt: string | null;
  readonly currency: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/finance/treasury"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to treasuries
      </Link>

      <GradientPanel className="p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Treasury Statement
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{scopeName}</h1>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-3 w-3" />
                {scopeType}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start gap-1 sm:items-end">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Live balance
            </span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-3xl font-semibold tabular-nums leading-none ${
                  liveBalance < 0 ? 'text-destructive' : 'text-foreground'
                }`}
              >
                {new Intl.NumberFormat().format(liveBalance)}
              </span>
              <span className="text-sm font-medium text-muted-foreground">{currency}</span>
            </div>
            {liveUpdatedAt && (
              <span className="text-xs text-muted-foreground">
                Updated {new Date(liveUpdatedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </GradientPanel>
    </div>
  );
}
