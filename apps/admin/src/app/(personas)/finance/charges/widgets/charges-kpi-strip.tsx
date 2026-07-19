import { StatsCard } from '@shesa/ui';

import type { ChargeKpis } from './charges-kpis';

/**
 * 5-up KPI strip above the charges table. Amount totals only render
 * when every visible charge shares one currency; multi-currency
 * portfolios show "—" instead of a misleading sum.
 */
export function ChargesKpiStrip({ kpis }: { readonly kpis: ChargeKpis }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatsCard label="Charges" value={kpis.total} />
      <StatsCard label="Active" value={kpis.active} />
      <StatsCard label="Draft" value={kpis.draft} />
      <StatsCard
        label="Expected"
        value={
          kpis.singleCurrency
            ? `${new Intl.NumberFormat().format(Math.round(kpis.expected))} ${kpis.singleCurrency}`
            : '—'
        }
      />
      <StatsCard
        label="Portfolio coverage"
        value={kpis.coverage !== null ? `${kpis.coverage}%` : '—'}
      />
    </div>
  );
}
