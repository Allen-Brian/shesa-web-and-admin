import { StatsCard } from '@shesa/ui';

import { formatCompactMoney } from '@/lib/finance/format-money';

import type {
  ArrearsRow,
  CollectionsRow,
  DonationReportRow,
  ExpenseByCategoryRow,
  PaymentMethodRow,
  TreasuryStatementRow,
} from '../report-actions';
import {
  computeArrearsInsights,
  computeCollectionsInsights,
  computeDonationsInsights,
  computeExpensesInsights,
  computePaymentMethodsInsights,
} from './insights-stats';
import { ReportBarChartPanel } from './report-bar-chart-panel';
import { ReportDonutPanel } from './report-donut-panel';
import type { RunResult } from './reports-types';

/**
 * KPI strip + chart card cluster shown above the results DataTable.
 * Per-report shape: matrix-style reports (collections / arrears /
 * donations) get a leaderboard bar chart; distribution reports
 * (payment methods / expenses) get a donut; treasury statement stops
 * at the 4-up KPI grid (a chart wouldn't add info to a single-row
 * summary). Data reductions live in `insights-stats.ts`.
 */
export function ResultInsights({
  result,
  scopeCurrency,
}: {
  readonly result: RunResult;
  readonly scopeCurrency: string;
}) {
  const currency = scopeCurrency;

  if (result.report === 'collections') {
    const rows = result.rows as (CollectionsRow & { __report: 'collections' })[];
    const s = computeCollectionsInsights(rows);
    return (
      <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Charges collecting" value={rows.length.toLocaleString()} />
          <StatsCard
            label="Total collected"
            value={formatCompactMoney(s.totalCollected, currency)}
          />
          <StatsCard label="Payments" value={s.totalPayments.toLocaleString()} />
          <StatsCard
            label="Avg per payment"
            value={
              s.totalPayments > 0
                ? formatCompactMoney(s.totalCollected / s.totalPayments, currency)
                : '—'
            }
          />
        </div>
        {s.chartData.length > 0 && (
          <ReportBarChartPanel
            title="Top charges by amount collected"
            data={s.chartData}
            currency={currency}
          />
        )}
      </>
    );
  }

  if (result.report === 'arrears') {
    const rows = result.rows as (ArrearsRow & { __report: 'arrears' })[];
    const s = computeArrearsInsights(rows);
    return (
      <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Rows" value={rows.length.toLocaleString()} />
          <StatsCard label="Members behind" value={s.memberCount.toLocaleString()} />
          <StatsCard label="Total arrears" value={formatCompactMoney(s.totalArrears, currency)} />
          <StatsCard
            label="Avg per row"
            value={
              rows.length > 0 ? formatCompactMoney(s.totalArrears / rows.length, currency) : '—'
            }
          />
        </div>
        {s.topOffenders.length > 0 && (
          <ReportBarChartPanel
            title="Largest outstanding balances"
            data={s.topOffenders}
            currency={currency}
            barFill="#f43f5e"
          />
        )}
      </>
    );
  }

  if (result.report === 'treasury_statement') {
    const rows = result.rows as (TreasuryStatementRow & { __report: 'treasury_statement' })[];
    const row = rows[0];
    if (!row) return null;
    const income = Number(row.income_sum ?? 0);
    const expenses = Number(row.expense_sum ?? 0);
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Opening"
          value={formatCompactMoney(Number(row.opening_balance), currency)}
        />
        <StatsCard label="Income" value={`+${formatCompactMoney(income, currency)}`} />
        <StatsCard label="Expenses" value={`−${formatCompactMoney(expenses, currency)}`} />
        <StatsCard
          label="Closing"
          value={formatCompactMoney(Number(row.closing_balance), currency)}
        />
      </div>
    );
  }

  if (result.report === 'payment_method_breakdown') {
    const rows = result.rows as (PaymentMethodRow & { __report: 'payment_method_breakdown' })[];
    const s = computePaymentMethodsInsights(rows);
    return (
      <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Methods used" value={rows.length.toLocaleString()} />
          <StatsCard label="Total collected" value={formatCompactMoney(s.total, currency)} />
          <StatsCard label="Top method" value={s.topLabel} />
          <StatsCard label="Top method share" value={s.topShare != null ? `${s.topShare}%` : '—'} />
        </div>
        {s.chartData.length > 0 && (
          <ReportDonutPanel
            title="Share of collections by method"
            data={s.chartData}
            currency={currency}
          />
        )}
      </>
    );
  }

  if (result.report === 'expense_report_by_category') {
    const rows = result.rows as (ExpenseByCategoryRow & {
      __report: 'expense_report_by_category';
    })[];
    const s = computeExpensesInsights(rows);
    return (
      <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Categories" value={rows.length.toLocaleString()} />
          <StatsCard label="Expenses" value={s.totalExpenses.toLocaleString()} />
          <StatsCard label="Total spent" value={formatCompactMoney(s.total, currency)} />
          <StatsCard
            label="Avg per category"
            value={rows.length > 0 ? formatCompactMoney(s.total / rows.length, currency) : '—'}
          />
        </div>
        {s.chartData.length > 0 && (
          <ReportDonutPanel
            title="Share of spend by category"
            data={s.chartData}
            currency={currency}
          />
        )}
      </>
    );
  }

  if (result.report === 'donation_report') {
    const rows = result.rows as (DonationReportRow & { __report: 'donation_report' })[];
    const s = computeDonationsInsights(rows);
    return (
      <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Campaigns" value={rows.length.toLocaleString()} />
          <StatsCard label="Total donated" value={formatCompactMoney(s.totalDonated, currency)} />
          <StatsCard label="Named donors" value={s.named.toLocaleString()} />
          <StatsCard label="Anonymous" value={s.anonymous.toLocaleString()} />
        </div>
        {s.chartData.length > 0 && (
          <ReportBarChartPanel
            title="Top campaigns by amount donated"
            data={s.chartData}
            currency={currency}
            barFill="#8b5cf6"
          />
        )}
      </>
    );
  }

  return null;
}
