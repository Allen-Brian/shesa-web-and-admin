'use client';

import { useMemo } from 'react';
import { Repeat, TrendingUp } from 'lucide-react';

import { StatsCard } from '@shesa/ui';

import { formatCompactMoney } from '@/lib/finance/format-money';

import type { ChargeDetailPoolProps } from './charge-detail-types';
import { ChargeChartCard } from './charge-chart-card';
import { ChargeConcentrationCurve } from './charge-concentration-curve';
import { ChargeCumulativeArea } from './charge-cumulative-area';
import { ChargeDailyPaymentsBar } from './charge-daily-payments-bar';
import { ChargeMethodDonut } from './charge-method-donut';
import { ChargeRankPanel } from './charge-rank-panel';
import { ChargeSourceComposition } from './charge-source-composition';
import { ChargeVitalStat } from './charge-vital-stat';
import { ChargeWeeklyMomentumChart } from './charge-weekly-momentum-chart';
import {
  buildConcentrationCurve,
  buildDailyPaymentSeries,
  buildWeeklyPaymentSeries,
  computeTopPayerConcentration,
} from './charge-pool-report-stats';
import { formatMoney, relativeDaysAgo, shortDate } from './shared-formatters';

/**
 * Reports flavour for pool-shape charges (goal / open / ticketed).
 * There are no per-member obligations, so the layout leans into
 * payer concentration + cadence: cumulative area, weekly momentum
 * (bars for amount, line for count), method/source splits, a Lorenz
 * curve of contributor concentration, and Largest / Most Recent
 * rank panels.
 */
export function ChargePoolReports(props: ChargeDetailPoolProps) {
  const {
    summary,
    poolPayments,
    paymentsByMethod,
    paymentsBySource,
    paymentTiming,
    cumulativeSeries,
    collected,
    payerCount,
  } = props;

  const settledPayments = useMemo(() => poolPayments.filter((p) => !p.isReversal), [poolPayments]);
  const reversals = poolPayments.filter((p) => p.isReversal).length;

  const largest = useMemo(
    () => [...settledPayments].sort((a, b) => b.amount - a.amount).slice(0, 5),
    [settledPayments],
  );
  const recent = useMemo(
    () =>
      [...settledPayments]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [settledPayments],
  );

  const dailySeries = useMemo(() => buildDailyPaymentSeries(settledPayments), [settledPayments]);
  const weeklySeries = useMemo(() => buildWeeklyPaymentSeries(settledPayments), [settledPayments]);
  const topPayerConcentration = useMemo(
    () => computeTopPayerConcentration(settledPayments, collected),
    [settledPayments, collected],
  );
  const concentrationCurve = useMemo(
    () => buildConcentrationCurve(settledPayments, collected),
    [settledPayments, collected],
  );

  const avgPayment = paymentTiming.avgAmount;
  const medianPayment = paymentTiming.medianAmount;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Unique payers" value={payerCount.toLocaleString()} />
        <StatsCard label="Collected" value={formatCompactMoney(collected, summary.currency)} />
        <StatsCard label="Payments" value={poolPayments.length.toLocaleString()} />
        <StatsCard
          label={summary.baseAmount !== null ? 'Unit price' : 'Reversals'}
          value={
            summary.baseAmount !== null
              ? formatCompactMoney(summary.baseAmount, summary.currency)
              : reversals.toLocaleString()
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ChargeVitalStat
          label="Avg. payment"
          value={settledPayments.length > 0 ? formatMoney(avgPayment, summary.currency) : '—'}
          hint={
            settledPayments.length > 0
              ? `Median ${formatMoney(medianPayment, summary.currency)}`
              : 'no payments'
          }
        />
        <ChargeVitalStat
          label="Last payment"
          value={paymentTiming.lastPaymentAt ? shortDate(paymentTiming.lastPaymentAt) : '—'}
          hint={
            paymentTiming.lastPaymentAt
              ? relativeDaysAgo(paymentTiming.lastPaymentAt)
              : 'no activity yet'
          }
        />
        <ChargeVitalStat
          label="Top-5 concentration"
          value={topPayerConcentration !== null ? `${topPayerConcentration}%` : '—'}
          hint="of total collected"
        />
        <ChargeVitalStat
          label="Reversal rate"
          value={
            poolPayments.length > 0
              ? `${Math.round((reversals / poolPayments.length) * 100)}%`
              : '—'
          }
          hint={`${reversals} reversal${reversals === 1 ? '' : 's'}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChargeChartCard title="Cumulative collection" subtitle="Running total over time">
          <ChargeCumulativeArea series={cumulativeSeries} currency={summary.currency} />
        </ChargeChartCard>

        <ChargeChartCard
          title="Weekly momentum"
          subtitle="Amount received per week + payment count"
        >
          <ChargeWeeklyMomentumChart data={weeklySeries} currency={summary.currency} />
        </ChargeChartCard>

        <ChargeChartCard title="Payment methods" subtitle="Share of collected amount">
          <ChargeMethodDonut methods={paymentsByMethod} currency={summary.currency} />
        </ChargeChartCard>

        <ChargeChartCard title="Payment source" subtitle="Auto-generated vs. manually recorded">
          <ChargeSourceComposition sources={paymentsBySource} currency={summary.currency} />
        </ChargeChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChargeChartCard
          title="Contributor concentration"
          subtitle={
            concentrationCurve.points.length > 0
              ? `Gini ${concentrationCurve.gini} · steeper = more top-heavy`
              : 'Lorenz curve of payer share'
          }
        >
          <ChargeConcentrationCurve
            points={concentrationCurve.points}
            gini={concentrationCurve.gini}
          />
        </ChargeChartCard>

        <ChargeChartCard title="Daily payments" subtitle="Amount received per day">
          <ChargeDailyPaymentsBar data={dailySeries} currency={summary.currency} />
        </ChargeChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChargeRankPanel
          title="Largest payments"
          icon={TrendingUp}
          iconClass="text-emerald-600 dark:text-emerald-400"
          empty="No payments yet."
          rows={largest.map((p) => ({
            id: p.id,
            label: p.payerLabel,
            value: formatMoney(p.amount, summary.currency),
          }))}
        />
        <ChargeRankPanel
          title="Most recent"
          icon={Repeat}
          iconClass="text-sky-600 dark:text-sky-400"
          empty="No payments yet."
          rows={recent.map((p) => ({
            id: p.id,
            label: p.payerLabel,
            value: new Date(p.createdAt).toLocaleDateString(),
          }))}
        />
      </div>
    </div>
  );
}
