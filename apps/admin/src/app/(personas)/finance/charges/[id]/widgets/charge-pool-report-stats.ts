import type { PoolPayment } from './charge-detail-types';
import { weekStartIso } from './shared-formatters';

/**
 * Per-day sum of amounts across the settled payments — feeds the
 * "Daily payments" bar chart. Sorted ascending by ISO date so
 * downstream charts read chronologically.
 */
export function buildDailyPaymentSeries(
  settled: readonly PoolPayment[],
): { date: string; amount: number }[] {
  const perDay = new Map<string, number>();
  for (const p of settled) {
    const day = p.createdAt.slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + p.amount);
  }
  return Array.from(perDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({ date, amount: Math.round(amount) }));
}

/**
 * ISO-week binning — amount + count per week (Monday start). The
 * weekly momentum chart draws bars for amount and overlays a line
 * for count, so both fields come out of one aggregation pass.
 */
export function buildWeeklyPaymentSeries(
  settled: readonly PoolPayment[],
): { week: string; amount: number; count: number }[] {
  const perWeek = new Map<string, { amount: number; count: number }>();
  for (const p of settled) {
    const week = weekStartIso(p.createdAt);
    const cur = perWeek.get(week) ?? { amount: 0, count: 0 };
    cur.amount += p.amount;
    cur.count += 1;
    perWeek.set(week, cur);
  }
  return Array.from(perWeek.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, s]) => ({ week, amount: Math.round(s.amount), count: s.count }));
}

/**
 * Fraction of `collected` that comes from the top-5 payers. Returns
 * null when we can't compute (no payments, or `collected` non-positive).
 */
export function computeTopPayerConcentration(
  settled: readonly PoolPayment[],
  collected: number,
): number | null {
  if (settled.length === 0 || collected <= 0) return null;
  const byPayer = new Map<string, number>();
  for (const p of settled) {
    byPayer.set(p.payerLabel, (byPayer.get(p.payerLabel) ?? 0) + p.amount);
  }
  const sorted = Array.from(byPayer.values()).sort((a, b) => b - a);
  const top5 = sorted.slice(0, 5).reduce((a, b) => a + b, 0);
  return Math.round((top5 / collected) * 100);
}

/**
 * Lorenz curve of contributor concentration. X = cumulative % of
 * payers ranked amount-desc, Y = cumulative % of collected. The
 * diagonal represents perfect equality; the steeper the curve rises
 * the more concentrated the giving is.
 *
 * Also returns a gini index in [0, 100] for the tooltip / hint copy.
 */
export interface ConcentrationCurveResult {
  readonly points: { payerPct: number; amountPct: number; label: string }[];
  readonly gini: number;
}

export function buildConcentrationCurve(
  settled: readonly PoolPayment[],
  collected: number,
): ConcentrationCurveResult {
  if (settled.length === 0 || collected <= 0) return { points: [], gini: 0 };
  const byPayer = new Map<string, number>();
  for (const p of settled) {
    byPayer.set(p.payerLabel, (byPayer.get(p.payerLabel) ?? 0) + p.amount);
  }
  const ordered = Array.from(byPayer.entries()).sort((a, b) => b[1] - a[1]);
  const n = ordered.length;
  const points: { payerPct: number; amountPct: number; label: string }[] = [
    { payerPct: 0, amountPct: 0, label: '' },
  ];
  let runningAmt = 0;
  ordered.forEach(([label, amt], idx) => {
    runningAmt += amt;
    points.push({
      payerPct: Math.round(((idx + 1) / n) * 100),
      amountPct: Math.round((runningAmt / collected) * 100),
      label,
    });
  });
  // Gini = 1 - 2 × area-under-curve / 10000 (percent squared).
  let area = 0;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]!;
    const p1 = points[i]!;
    area += ((p1.payerPct - p0.payerPct) * (p0.amountPct + p1.amountPct)) / 2;
  }
  const giniIndex = Math.round((1 - (2 * area) / 10000) * 100);
  return { points, gini: giniIndex };
}
