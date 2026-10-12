'use client';

import { useMemo } from 'react';

import { StatsCard } from '@shesa/ui';

import type { ObligationRow } from './obligation-widget-types';

interface KpiStripProps {
  readonly rows: readonly ObligationRow[];
}

/**
 * Four at-a-glance counters + a per-currency outstanding chip strip
 * that surfaces only when the row set carries more than one currency
 * (rare for one branch, common for the global view).
 */
export function KpiStrip({ rows }: KpiStripProps) {
  const kpis = useMemo(() => {
    const currencies = new Map<string, { expected: number; paid: number; outstanding: number }>();
    let paid = 0;
    let outstanding = 0;
    for (const r of rows) {
      const cur = currencies.get(r.currency) ?? { expected: 0, paid: 0, outstanding: 0 };
      cur.expected += r.amount;
      cur.paid += r.paid;
      cur.outstanding += r.outstanding;
      currencies.set(r.currency, cur);
      if (r.status === 'paid') paid += 1;
      else if (r.status === 'open' || r.status === 'partial') outstanding += 1;
    }
    return { total: rows.length, paid, outstanding, currencies };
  }, [rows]);

  const singleTotal = kpis.currencies.size === 1 ? kpis.currencies.entries().next().value : null;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Obligations" value={kpis.total} />
        <StatsCard label="Outstanding" value={kpis.outstanding} />
        <StatsCard label="Paid" value={kpis.paid} />
        <StatsCard
          label="Total outstanding"
          value={
            singleTotal
              ? `${new Intl.NumberFormat().format(Math.round(singleTotal[1].outstanding))} ${singleTotal[0]}`
              : '—'
          }
        />
      </div>

      {kpis.currencies.size > 1 && (
        <div className="flex flex-wrap gap-3">
          {Array.from(kpis.currencies.entries()).map(([currency, s]) => (
            <div
              key={currency}
              className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3"
            >
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Outstanding · {currency}
              </span>
              <span className="text-xl font-semibold text-foreground tabular-nums">
                {new Intl.NumberFormat().format(Math.round(s.outstanding))}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
