'use client';

import { useMemo } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

import { StatsCard } from '@shesa/ui';

import { formatCompactMoney } from '@/lib/finance/format-money';

import type { ChargeDetailMatrixProps } from './charge-detail-types';
import { ChargeChartCard } from './charge-chart-card';
import { ChargeCoverageHistogram } from './charge-coverage-histogram';
import { ChargeCumulativeArea } from './charge-cumulative-area';
import { ChargeMethodDonut } from './charge-method-donut';
import { ChargePeriodCollectionBar } from './charge-period-collection-bar';
import { ChargePeriodLeaderboard } from './charge-period-leaderboard';
import { ChargeProgressPanel } from './charge-progress-panel';
import { ChargeRankPanel } from './charge-rank-panel';
import { ChargeSourceComposition } from './charge-source-composition';
import { ChargeVitalSignsStrip } from './charge-vital-signs-strip';
import {
  buildCoverageDistribution,
  buildMatrixPeriodStats,
  buildMemberTotals,
} from './charge-matrix-report-stats';
import { ChargeYearlyAnalysis } from './charge-yearly-analysis';
import { formatMoney } from './shared-formatters';

/**
 * Reports flavour for the "members" matrix variant — one obligation
 * fans out to each member (branch monthly dues, subset-of-batch
 * levy). Emphasises per-member distribution: coverage histogram,
 * top payers, most behind, plus the shared cumulative + method /
 * source panels.
 */
export function ChargeMatrixReports(props: ChargeDetailMatrixProps) {
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
  } = props;
  const outstanding = Math.max(0, expected - collected);
  const progress = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0;
  const activePeriods = periods.filter((p) => !p.isUpcoming).length;

  const periodStats = useMemo(() => buildMatrixPeriodStats(periods, members), [periods, members]);
  const collectionByPeriod = useMemo(() => periodStats.slice().reverse(), [periodStats]);
  const coverageDistribution = useMemo(
    () => buildCoverageDistribution(periods, members),
    [periods, members],
  );
  const memberTotals = useMemo(() => buildMemberTotals(periods, members), [periods, members]);

  const topPayers = memberTotals.filter((m) => m.paid > 0).slice(0, 5);
  const behind = memberTotals
    .filter((m) => m.outstanding > 0.0001)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 5);
  const fullyPaid = memberTotals.filter((m) => m.owed > 0 && m.outstanding < 0.0001).length;
  const bestPeriod = [...periodStats].sort((a, b) => b.coverage - a.coverage)[0];
  const worstPeriod = [...periodStats].sort((a, b) => a.coverage - b.coverage)[0];
  const arpm = members.length > 0 ? collected / members.length : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard label="Members" value={members.length.toLocaleString()} />
        <StatsCard label="Active periods" value={activePeriods.toLocaleString()} />
        <StatsCard label="Expected" value={formatCompactMoney(expected, summary.currency)} />
        <StatsCard label="Collected" value={formatCompactMoney(collected, summary.currency)} />
        <StatsCard label="Outstanding" value={formatCompactMoney(outstanding, summary.currency)} />
      </div>

      <ChargeVitalSignsStrip
        currency={summary.currency}
        progress={progress}
        timing={paymentTiming}
        arpm={arpm}
        fullyPaid={fullyPaid}
        totalMembers={members.length}
        bestPeriodLabel={bestPeriod?.period ?? '—'}
        bestPeriodCoverage={bestPeriod ? Math.round(bestPeriod.coverage * 100) : null}
      />

      <ChargeProgressPanel
        progress={progress}
        collected={collected}
        outstanding={outstanding}
        fullyPaid={fullyPaid}
        totalMembers={members.length}
        currency={summary.currency}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChargeChartCard title="Collection by period" subtitle="Paid vs. still owed per cycle">
          <ChargePeriodCollectionBar data={collectionByPeriod} currency={summary.currency} />
        </ChargeChartCard>

        <ChargeChartCard title="Cumulative collection" subtitle="Running total over time">
          <ChargeCumulativeArea series={cumulativeSeries} currency={summary.currency} />
        </ChargeChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChargeChartCard title="Payment methods" subtitle="Share of collected amount">
          <ChargeMethodDonut methods={paymentsByMethod} currency={summary.currency} />
        </ChargeChartCard>

        <ChargeChartCard title="Payment source" subtitle="Auto-generated vs. manually recorded">
          <ChargeSourceComposition sources={paymentsBySource} currency={summary.currency} />
        </ChargeChartCard>

        <ChargeChartCard title="Coverage distribution" subtitle="Members by paid-share bucket">
          <ChargeCoverageHistogram data={coverageDistribution} />
        </ChargeChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChargeRankPanel
          title="Top payers"
          icon={TrendingUp}
          iconClass="text-emerald-600 dark:text-emerald-400"
          empty="No payments yet."
          rows={topPayers.map((m) => ({
            id: m.memberId,
            label: m.name,
            value: formatMoney(m.paid, summary.currency),
          }))}
        />
        <ChargeRankPanel
          title="Most behind"
          icon={TrendingDown}
          iconClass="text-destructive"
          empty="Everyone is caught up."
          rows={behind.map((m) => ({
            id: m.memberId,
            label: m.name,
            value: formatMoney(m.outstanding, summary.currency),
          }))}
        />
      </div>

      {periodStats.length > 0 && (
        <ChargePeriodLeaderboard
          rows={periodStats.slice().sort((a, b) => b.coverage - a.coverage)}
          bestLabel={bestPeriod?.period ?? '—'}
          worstLabel={worstPeriod?.period ?? '—'}
          bestCoverage={bestPeriod ? bestPeriod.coverage : null}
          worstCoverage={worstPeriod ? worstPeriod.coverage : null}
          currency={summary.currency}
        />
      )}

      {/*
       * Yearly analysis only surfaces when we have data across more
       * than one calendar month (otherwise the panel is noise).
       */}
      <ChargeYearlyAnalysis periods={periods} members={members} currency={summary.currency} />
    </div>
  );
}
