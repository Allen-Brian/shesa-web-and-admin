import { StatsCard } from '@shesa/ui';

import { formatCompactMoney } from '@/lib/finance/format-money';

import type { ChargeKpis } from './charges-kpis';

/**
 * 5-up KPI strip above the charges table. The Expected total is
 * rendered in the compact K/M form for readability inside a
 * StatsCard; falls back to XAF on a mixed-currency portfolio so we
 * always show a number, never a dash.
 */
export function ChargesKpiStrip({ kpis }: { readonly kpis: ChargeKpis }) {
  const currency = kpis.singleCurrency ?? 'XAF';
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatsCard label="Charges" value={kpis.total} />
      <StatsCard label="Active" value={kpis.active} />
      <StatsCard label="Draft" value={kpis.draft} />
      <StatsCard label="Expected" value={formatCompactMoney(kpis.expected, currency)} />
      <StatsCard
        label="Portfolio coverage"
        value={kpis.coverage !== null ? `${kpis.coverage}%` : '—'}
      />
    </div>
  );
}
