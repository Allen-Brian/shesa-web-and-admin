import type {
  ArrearsRow,
  CollectionsRow,
  DonationReportRow,
  ExpenseByCategoryRow,
  PaymentMethodRow,
} from '../report-actions';
import { formatMethod, shorten } from './reports-formatters';

/**
 * Per-report aggregation helpers that feed the insights KPI strip and
 * chart panels. Kept plain (non-JSX) so the insights component is
 * layout-only.
 */

interface RankedBarPoint {
  readonly name: string;
  readonly value: number;
}

export interface CollectionsInsights {
  readonly totalCollected: number;
  readonly totalPayments: number;
  readonly chartData: readonly RankedBarPoint[];
}

export function computeCollectionsInsights(
  rows: readonly (CollectionsRow & { __report: 'collections' })[],
): CollectionsInsights {
  const totalCollected = rows.reduce((a, b) => a + Number(b.total_collected ?? 0), 0);
  const totalPayments = rows.reduce((a, b) => a + Number(b.payment_count ?? 0), 0);
  const chartData = rows
    .slice()
    .sort((a, b) => Number(b.total_collected) - Number(a.total_collected))
    .slice(0, 8)
    .map((r) => ({ name: shorten(String(r.charge_name), 18), value: Number(r.total_collected) }));
  return { totalCollected, totalPayments, chartData };
}

export interface ArrearsInsights {
  readonly totalArrears: number;
  readonly memberCount: number;
  readonly topOffenders: readonly RankedBarPoint[];
}

export function computeArrearsInsights(
  rows: readonly (ArrearsRow & { __report: 'arrears' })[],
): ArrearsInsights {
  const totalArrears = rows.reduce((a, b) => a + Number(b.arrears ?? 0), 0);
  const memberCount = new Set(rows.map((r) => r.member_name)).size;
  const topOffenders = rows
    .slice()
    .sort((a, b) => Number(b.arrears) - Number(a.arrears))
    .slice(0, 8)
    .map((r) => ({ name: shorten(String(r.member_name), 18), value: Number(r.arrears) }));
  return { totalArrears, memberCount, topOffenders };
}

export interface PaymentMethodsInsights {
  readonly total: number;
  readonly topLabel: string;
  readonly topShare: number | null;
  readonly chartData: readonly { name: string; value: number; count: number }[];
}

export function computePaymentMethodsInsights(
  rows: readonly (PaymentMethodRow & { __report: 'payment_method_breakdown' })[],
): PaymentMethodsInsights {
  const total = rows.reduce((a, b) => a + Number(b.total_amount ?? 0), 0);
  const top = rows.slice().sort((a, b) => Number(b.total_amount) - Number(a.total_amount))[0];
  const chartData = rows.map((r) => ({
    name: formatMethod(String(r.method)),
    value: Number(r.total_amount),
    count: Number(r.payment_count),
  }));
  return {
    total,
    topLabel: top ? formatMethod(String(top.method)) : '—',
    topShare: top && total > 0 ? Math.round((Number(top.total_amount) / total) * 100) : null,
    chartData,
  };
}

export interface ExpensesInsights {
  readonly total: number;
  readonly totalExpenses: number;
  readonly chartData: readonly { name: string; value: number; count: number }[];
}

export function computeExpensesInsights(
  rows: readonly (ExpenseByCategoryRow & { __report: 'expense_report_by_category' })[],
): ExpensesInsights {
  const total = rows.reduce((a, b) => a + Number(b.total_amount ?? 0), 0);
  const totalExpenses = rows.reduce((a, b) => a + Number(b.expense_count ?? 0), 0);
  const chartData = rows.map((r) => ({
    name: String(r.category_name ?? '(uncategorized)'),
    value: Number(r.total_amount),
    count: Number(r.expense_count),
  }));
  return { total, totalExpenses, chartData };
}

export interface DonationsInsights {
  readonly totalDonated: number;
  readonly named: number;
  readonly anonymous: number;
  readonly chartData: readonly RankedBarPoint[];
}

export function computeDonationsInsights(
  rows: readonly (DonationReportRow & { __report: 'donation_report' })[],
): DonationsInsights {
  const totalDonated = rows.reduce((a, b) => a + Number(b.total_donated ?? 0), 0);
  const named = rows.reduce((a, b) => a + Number(b.named_donor_count ?? 0), 0);
  const anonymous = rows.reduce((a, b) => a + Number(b.anonymous_count ?? 0), 0);
  const chartData = rows
    .slice()
    .sort((a, b) => Number(b.total_donated) - Number(a.total_donated))
    .slice(0, 8)
    .map((r) => ({ name: shorten(String(r.charge_name), 18), value: Number(r.total_donated) }));
  return { totalDonated, named, anonymous, chartData };
}
