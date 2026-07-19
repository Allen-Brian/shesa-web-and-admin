'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Download } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import { PERIOD_OPTIONS, type Period } from './statement-types';

/**
 * Period preset chip row + entry count + Print/PDF affordance. Period
 * changes navigate — the current URL's `?period=` search param
 * drives the server-side reload so the statement re-renders with a
 * fresh window.
 */
export function StatementPeriodBar({
  current,
  scopeSlug,
  entriesCount,
}: {
  readonly current: Period;
  readonly scopeSlug: string;
  readonly entriesCount: number;
}) {
  const router = useRouter();
  const search = useSearchParams();

  const setPeriod = (p: Period) => {
    const params = new URLSearchParams(search?.toString());
    params.set('period', p);
    router.push(`/finance/treasury/${scopeSlug}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <GradientPanel muted className="flex flex-wrap gap-1 rounded-xl p-1">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPeriod(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              current === opt.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </GradientPanel>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {entriesCount} {entriesCount === 1 ? 'movement' : 'movements'} in window
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Download className="h-3.5 w-3.5" />
          Print / PDF
        </button>
      </div>
    </div>
  );
}
