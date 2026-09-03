import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, CircleDollarSign } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import { DashboardEmptyBlock } from './dashboard-empty-block';
import { formatPaymentMethod } from '@/lib/format/payment-method';
import { formatRelativeShort } from '@/lib/format/relative-time';
import type { Transaction } from './dashboard-types';

export function DashboardLatestTransactionsCard({
  rows,
}: {
  readonly rows: readonly Transaction[];
}) {
  return (
    <GradientPanel className="p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <CircleDollarSign className="h-4 w-4 text-primary" />
            Latest transactions
          </h2>
          <p className="text-xs text-muted-foreground">Most recent payments in your reach</p>
        </div>
        <Link
          href="/finance/transactions"
          className="text-xs font-medium text-primary hover:underline"
        >
          Open ledger →
        </Link>
      </div>
      {rows.length === 0 ? (
        <DashboardEmptyBlock label="No payments recorded yet." />
      ) : (
        <ul className="divide-y divide-border/40">
          {rows.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  t.isReversal
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {t.isReversal ? (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-sm font-medium text-foreground">{t.payer}</span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {t.what} · {formatPaymentMethod(t.method)}
                </span>
              </div>
              <div className="text-right leading-tight">
                <div
                  className={`text-sm font-semibold tabular-nums ${
                    t.isReversal ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
                  }`}
                >
                  {t.isReversal ? '−' : ''}
                  {new Intl.NumberFormat().format(t.amount)} {t.currency}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {formatRelativeShort(t.createdAt)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </GradientPanel>
  );
}
