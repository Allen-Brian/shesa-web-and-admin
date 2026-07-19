'use client';

import { useMemo } from 'react';

import { StatsCard } from '@shesa/ui';

import type { ChargeDetailMatrixProps } from './charge-detail-types';
import { ChargeChartCard } from './charge-chart-card';
import { ChargeCumulativeArea } from './charge-cumulative-area';
import { ChargeMethodDonut } from './charge-method-donut';
import { ChargePartyLedgerCard } from './charge-party-ledger-card';
import { ChargePaymentLog } from './charge-payment-log';
import { ChargePeriodCollectionBar } from './charge-period-collection-bar';
import { ChargeProgressPanel } from './charge-progress-panel';
import { ChargeSourceComposition } from './charge-source-composition';
import { ChargeVitalStat } from './charge-vital-stat';
import { formatMoney, formatPeriodHeader, relativeDaysAgo, shortDate } from './shared-formatters';

/**
 * Reports flavour for charges where a scope owes as a collective
 * (chapter, batch, branch). Per-member panels (coverage histogram,
 * top payers, most behind) don't add value with a single obligor;
 * this layout swaps in a party-ledger grid + payment log.
 */
export function ChargeScopeBodyReports(props: ChargeDetailMatrixProps) {
  const {
    summary,
    expected,
    collected,
    periods,
    members,
    paymentsByMethod,
    paymentsBySource,
    paymentTiming,
    cumulativeSeries,
    paymentLog,
  } = props;
  const outstanding = Math.max(0, expected - collected);
  const progress = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0;
  const activePeriods = periods.filter((p) => !p.isUpcoming).length;

  // Per-period aggregation for the scope-body period breakdown.
  const periodStats = useMemo(() => {
    return periods
      .filter((p) => !p.isUpcoming)
      .map((p) => {
        const originalIdx = periods.findIndex((pp) => pp.key === p.key);
        let paid = 0;
        let owed = 0;
        for (const m of members) {
          const c = m.cells[originalIdx];
          if (!c) continue;
          paid += c.paid;
          owed += c.owed;
        }
        return {
          key: p.key,
          period: formatPeriodHeader(p),
          Paid: Math.round(paid),
          Outstanding: Math.round(Math.max(0, owed - paid)),
          coverage: owed > 0 ? paid / owed : 0,
          paidMembers: 0,
          totalMembers: 0,
        };
      });
  }, [periods, members]);

  // Per-scope-body summary (paid / owed / remaining). One card each.
  const scopeSummaries = useMemo(() => {
    return members.map((m) => {
      const t = m.cells.reduce(
        (acc, c, idx) => {
          const p = periods[idx];
          if (!c || !p || p.isUpcoming) return acc;
          acc.paid += c.paid;
          acc.owed += c.owed;
          return acc;
        },
        { paid: 0, owed: 0 },
      );
      const outstandingLocal = Math.max(0, t.owed - t.paid);
      const coverage = t.owed > 0 ? Math.min(1, t.paid / t.owed) : 1;
      return {
        id: m.memberId,
        name: m.fullName,
        scopeType: m.scopeType,
        paid: t.paid,
        owed: t.owed,
        outstanding: outstandingLocal,
        coverage,
      };
    });
  }, [members, periods]);

  const lastPaymentHint = paymentTiming.lastPaymentAt
    ? relativeDaysAgo(paymentTiming.lastPaymentAt)
    : 'no activity yet';

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard label="Obligors" value={members.length.toLocaleString()} />
        <StatsCard label="Active periods" value={activePeriods.toLocaleString()} />
        <StatsCard label="Expected" value={formatMoney(expected, summary.currency)} />
        <StatsCard label="Collected" value={formatMoney(collected, summary.currency)} />
        <StatsCard label="Outstanding" value={formatMoney(outstanding, summary.currency)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ChargeVitalStat label="Collection rate" value={`${progress}%`} hint="of expected" />
        <ChargeVitalStat
          label="Avg. payment"
          value={
            paymentTiming.count > 0 ? formatMoney(paymentTiming.avgAmount, summary.currency) : '—'
          }
          hint={paymentTiming.count > 0 ? `${paymentTiming.count} settled` : 'no payments yet'}
        />
        <ChargeVitalStat
          label="Last payment"
          value={paymentTiming.lastPaymentAt ? shortDate(paymentTiming.lastPaymentAt) : '—'}
          hint={lastPaymentHint}
        />
        <ChargeVitalStat
          label="Party count"
          value={members.length.toLocaleString()}
          hint="scope obligors on this charge"
        />
      </div>

      <ChargeProgressPanel
        progress={progress}
        collected={collected}
        outstanding={outstanding}
        fullyPaid={scopeSummaries.filter((s) => s.owed > 0 && s.outstanding <= 0.0001).length}
        totalMembers={members.length}
        currency={summary.currency}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {scopeSummaries.map((s) => (
          <ChargePartyLedgerCard
            key={s.id}
            name={s.name}
            scopeType={s.scopeType ?? null}
            paid={s.paid}
            owed={s.owed}
            outstanding={s.outstanding}
            coverage={s.coverage}
            currency={summary.currency}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChargeChartCard title="Cumulative collection" subtitle="Running total over time">
          <ChargeCumulativeArea series={cumulativeSeries} currency={summary.currency} />
        </ChargeChartCard>

        <ChargeChartCard title="Period breakdown" subtitle="Paid vs. still owed per cycle">
          <ChargePeriodCollectionBar
            data={periodStats.slice().reverse()}
            currency={summary.currency}
          />
        </ChargeChartCard>

        <ChargeChartCard title="Payment methods" subtitle="Share of collected amount">
          <ChargeMethodDonut methods={paymentsByMethod} currency={summary.currency} />
        </ChargeChartCard>

        <ChargeChartCard title="Payment source" subtitle="Auto-generated vs. manually recorded">
          <ChargeSourceComposition sources={paymentsBySource} currency={summary.currency} />
        </ChargeChartCard>
      </div>

      <ChargePaymentLog rows={paymentLog} currency={summary.currency} />
    </div>
  );
}
