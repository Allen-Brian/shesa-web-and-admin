import Link from 'next/link';
import { BadgeDollarSign } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import { DashboardEmptyBlock } from './dashboard-empty-block';
import type { ChargeCompletion } from './dashboard-types';

function barColor(percent: number): string {
  if (percent >= 80) return 'bg-emerald-500';
  if (percent >= 40) return 'bg-primary';
  return 'bg-amber-500';
}

export function DashboardChargesCompletionCard({
  rows,
}: {
  readonly rows: readonly ChargeCompletion[];
}) {
  return (
    <GradientPanel className="p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <BadgeDollarSign className="h-4 w-4 text-primary" />
            Charges completion
          </h2>
          <p className="text-xs text-muted-foreground">Where dues and levies stand this cycle</p>
        </div>
        <Link
          href="/exco/finance-view/charges"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all →
        </Link>
      </div>
      {rows.length === 0 ? (
        <DashboardEmptyBlock label="No active per-member charges to track." />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium text-foreground">{r.name}</span>
                  <span className="text-[11px] text-muted-foreground">{r.scopeName}</span>
                </div>
                <span className="text-xs font-medium text-foreground tabular-nums">
                  {r.percent}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor(r.percent)}`}
                  style={{ width: `${r.percent}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {new Intl.NumberFormat().format(Math.round(r.paid))} /{' '}
                {new Intl.NumberFormat().format(Math.round(r.expected))} {r.currency}
              </span>
            </li>
          ))}
        </ul>
      )}
    </GradientPanel>
  );
}
