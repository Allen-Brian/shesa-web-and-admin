'use client';

import { useMemo } from 'react';

import { GradientPanel } from '@shesa/ui';

import { ChargeChartCard } from './charge-chart-card';
import { chargeMonthShort, ChargeMonthlyHeatmap } from './charge-monthly-heatmap';
import { ChargeSeasonalLine } from './charge-seasonal-line';
import { ChargeVitalStat } from './charge-vital-stat';
import { ChargeYearlyTotalsBar } from './charge-yearly-totals-bar';
import {
  buildSeasonalLine,
  buildYearlyStats,
  computeYtd,
  hasYearlyRollupData,
} from './charge-yearly-analysis-stats';
import type { MatrixMember, MatrixPeriod } from './charge-detail-types';
import { formatMoney } from './shared-formatters';

/**
 * Rolls per-period paid/owed into calendar years, then surfaces:
 *   1. YTD vs prior-YTD KPIs (through the same calendar day)
 *   2. Yearly totals stacked bar (collected + outstanding)
 *   3. Seasonal coverage line (avg coverage per calendar month
 *      across every year)
 *   4. Monthly heatmap (years × months, coverage-tinted)
 *
 * Short-circuits to a placeholder until the charge has periods
 * spanning at least two distinct calendar months (otherwise the
 * rollups are noise).
 */
export function ChargeYearlyAnalysis({
  periods,
  members,
  currency,
}: {
  readonly periods: readonly MatrixPeriod[];
  readonly members: readonly MatrixMember[];
  readonly currency: string;
}) {
  const stats = useMemo(() => buildYearlyStats(periods, members), [periods, members]);
  const hasEnoughData = useMemo(() => hasYearlyRollupData(periods), [periods]);

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  const priorYear = stats.find((y) => y.year === currentYear - 1);
  const ytd = useMemo(
    () => computeYtd(stats, currentYear, currentMonth),
    [stats, currentYear, currentMonth],
  );
  const seasonal = useMemo(() => buildSeasonalLine(stats, chargeMonthShort), [stats]);

  if (!hasEnoughData) {
    return (
      <GradientPanel className="flex flex-col gap-2 p-5">
        <span className="text-sm font-medium text-foreground">Yearly analysis</span>
        <p className="text-xs italic text-muted-foreground">
          Not enough history yet. Yearly rollups surface once the charge has periods across two or
          more calendar months.
        </p>
      </GradientPanel>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium text-foreground">Yearly analysis</span>
        <span className="text-xs text-muted-foreground">
          {stats.length} year{stats.length === 1 ? '' : 's'} of history
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ChargeVitalStat
          label={`YTD collected (${currentYear})`}
          value={formatMoney(ytd.cur.paid, currency)}
          hint={`through ${chargeMonthShort(currentMonth)}`}
        />
        <ChargeVitalStat
          label={`Prior YTD (${currentYear - 1})`}
          value={priorYear ? formatMoney(ytd.prev.paid, currency) : '—'}
          hint={priorYear ? `same window last year` : 'no prior year'}
        />
        <ChargeVitalStat
          label="YoY delta"
          value={ytd.delta === null ? '—' : `${ytd.delta >= 0 ? '+' : ''}${ytd.delta}%`}
          hint={
            ytd.delta === null
              ? 'no comparable prior period'
              : ytd.delta >= 0
                ? 'ahead of last year'
                : 'behind last year'
          }
        />
        <ChargeVitalStat
          label="Best year"
          value={
            stats.length > 0
              ? String(stats.slice().sort((a, b) => b.coverage - a.coverage)[0]!.year)
              : '—'
          }
          hint={
            stats.length > 0
              ? `${stats.slice().sort((a, b) => b.coverage - a.coverage)[0]!.coverage}% coverage`
              : ''
          }
        />
      </div>

      <ChargeChartCard title="Yearly totals" subtitle="Collected vs expected per year">
        <ChargeYearlyTotalsBar
          data={stats.map((y) => ({
            year: String(y.year),
            Collected: Math.round(y.paid),
            Outstanding: Math.round(Math.max(0, y.owed - y.paid)),
          }))}
          currency={currency}
        />
      </ChargeChartCard>

      <ChargeChartCard title="Seasonal coverage" subtitle="Avg coverage by calendar month">
        <ChargeSeasonalLine data={seasonal} />
      </ChargeChartCard>

      <ChargeChartCard title="Monthly heatmap" subtitle="Rows = years · columns = Jan → Dec">
        <ChargeMonthlyHeatmap stats={stats} currency={currency} />
      </ChargeChartCard>
    </div>
  );
}
