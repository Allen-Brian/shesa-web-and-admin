import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Minus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import { formatAmount, formatRelative } from './treasury-landing-helpers';
import type { TreasuryEntry } from './treasury-landing-types';

/**
 * One treasury card in the landing grid — scope name + type chip on
 * top, live balance headline in the middle, then a boxed 30-day
 * activity row (income in / expenses out / net). Card is a link to
 * the statement drill-down; hover state tints the border.
 */
export function TreasuryCard({ t }: { readonly t: TreasuryEntry }) {
  const negative = t.balance < 0;
  const href = t.scopeSlug ? `/finance/treasury/${t.scopeSlug}` : '#';
  const netTone =
    t.thirtyDayNet > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : t.thirtyDayNet < 0
        ? 'text-destructive'
        : 'text-muted-foreground';
  const NetIcon = t.thirtyDayNet > 0 ? TrendingUp : t.thirtyDayNet < 0 ? TrendingDown : Minus;

  return (
    <Link href={href} className="group block">
      <GradientPanel className="flex flex-col gap-5 p-5 transition-all group-hover:border-primary/50 group-hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="truncate text-base font-semibold text-foreground">{t.scopeName}</span>
            <span className="w-fit rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {t.scopeType}
            </span>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
            <Wallet className="h-4 w-4" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Balance
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-3xl font-semibold leading-none tabular-nums ${
                negative ? 'text-destructive' : 'text-foreground'
              }`}
            >
              {formatAmount(t.balance)}
            </span>
            <span className="text-sm font-medium text-muted-foreground">{t.currency}</span>
          </div>
        </div>

        {/* 30-day activity — income + expenses + net so operators
         * can spot a stalled treasury before opening the statement. */}
        <div className="flex flex-col gap-1 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-xs">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Last 30 days</span>
            <span className={`inline-flex items-center gap-1 font-medium tabular-nums ${netTone}`}>
              <NetIcon className="h-3 w-3" />
              {t.thirtyDayNet >= 0 ? '+' : ''}
              {formatAmount(t.thirtyDayNet)}
            </span>
          </div>
          <div className="flex items-baseline justify-between text-[11px] text-muted-foreground tabular-nums">
            <span className="inline-flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-600" />
              {formatAmount(t.thirtyDayIncome)} in
            </span>
            <span className="inline-flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3 text-destructive" />
              {formatAmount(t.thirtyDayExpenses)} out
            </span>
            <span>
              {t.thirtyDayEntryCount} entr{t.thirtyDayEntryCount === 1 ? 'y' : 'ies'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <span>Updated {formatRelative(t.updatedAt)}</span>
          <span className="inline-flex items-center gap-0.5 font-medium text-primary transition-transform group-hover:translate-x-0.5">
            View statement
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </GradientPanel>
    </Link>
  );
}
