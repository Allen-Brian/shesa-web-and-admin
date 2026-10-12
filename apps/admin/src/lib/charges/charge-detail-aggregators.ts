import type {
  MatrixPeriod,
  PaymentMethodStat,
  PaymentSourceStat,
  PaymentTimingStats,
  SeriesPoint,
} from '@/app/(personas)/finance/charges/[id]/widgets/charge-detail-types';

import type { RawCharge, RawPayment } from './charge-detail-raw-types';

const UPCOMING_COUNT = 3;
const RECURRENCE_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  biannual: 6,
  yearly: 12,
};

/**
 * Pure aggregators over the raw payment / obligation rows the loader
 * fetches. Kept plain (no `server-only`) so they're unit-testable
 * without Supabase.
 */

export function aggregateByMethod(payments: readonly RawPayment[]): readonly PaymentMethodStat[] {
  const agg = new Map<string, { count: number; amount: number }>();
  for (const p of payments) {
    if (p.reverses_payment_id) continue;
    const key = p.method;
    const cur = agg.get(key) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += p.amount;
    agg.set(key, cur);
  }
  return Array.from(agg.entries())
    .map(([method, s]) => ({ method, count: s.count, amount: s.amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function aggregateBySource(payments: readonly RawPayment[]): readonly PaymentSourceStat[] {
  const agg = new Map<string, { count: number; amount: number }>();
  for (const p of payments) {
    if (p.reverses_payment_id) continue;
    const key = p.source;
    const cur = agg.get(key) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += p.amount;
    agg.set(key, cur);
  }
  return Array.from(agg.entries())
    .map(([source, s]) => ({ source, count: s.count, amount: s.amount }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * count + avg + median + last-payment-timestamp for the settled
 * payments — reversals are skipped so the average doesn't drift
 * downward on a scope with many refunds.
 */
export function computeTimingStats(payments: readonly RawPayment[]): PaymentTimingStats {
  const settled = payments.filter((p) => !p.reverses_payment_id);
  if (settled.length === 0) {
    return { count: 0, avgAmount: 0, medianAmount: 0, lastPaymentAt: null };
  }
  const amounts = settled.map((p) => p.amount).sort((a, b) => a - b);
  const sum = amounts.reduce((a, b) => a + b, 0);
  const mid = Math.floor(amounts.length / 2);
  const median =
    amounts.length % 2 === 0
      ? ((amounts[mid - 1] ?? 0) + (amounts[mid] ?? 0)) / 2
      : (amounts[mid] ?? 0);
  const lastAt =
    settled
      .map((p) => p.created_at)
      .sort()
      .slice(-1)[0] ?? null;
  return {
    count: settled.length,
    avgAmount: sum / settled.length,
    medianAmount: median,
    lastPaymentAt: lastAt,
  };
}

/**
 * Daily cumulative-total series for the "Collection curve" chart.
 * Reversal rows subtract; the daily bucket is `yyyy-MM-dd` so the
 * client can interpolate between points without worrying about
 * time-zone drift.
 */
export function buildCumulativeSeries(payments: readonly RawPayment[]): readonly SeriesPoint[] {
  const perDay = new Map<string, number>();
  for (const p of payments) {
    const day = p.created_at.slice(0, 10);
    const amt = p.amount;
    const signed = p.reverses_payment_id ? -amt : amt;
    perDay.set(day, (perDay.get(day) ?? 0) + signed);
  }
  const days = Array.from(perDay.keys()).sort();
  let running = 0;
  return days.map((d) => {
    running += perDay.get(d) ?? 0;
    return { date: d, cumulative: running, daily: perDay.get(d) ?? 0 };
  });
}

/**
 * Fabricates the next `UPCOMING_COUNT` periods for a recurring charge
 * based on the anchor (last existing period start, or activation
 * date) + the recurrence stride. Lets the collection table paint the
 * upcoming columns before the obligation generator has run.
 *
 * Returns furthest-first — the caller reverses when it wants ascending.
 */
export function generateUpcomingPeriods(
  charge: RawCharge,
  existingKeys: readonly string[],
): readonly MatrixPeriod[] {
  if (charge.recurrence === 'one_time') return [];
  const monthsPerCycle = RECURRENCE_MONTHS[charge.recurrence];
  if (!monthsPerCycle) return [];
  const stride = monthsPerCycle * (charge.recurrence_interval || 1);

  const dated = existingKeys.filter((k) => k !== 'one-off').sort();
  const anchor =
    dated.length > 0
      ? new Date(dated[dated.length - 1]!)
      : charge.activation_date
        ? new Date(charge.activation_date)
        : new Date();

  if (Number.isNaN(anchor.getTime())) return [];

  const out: MatrixPeriod[] = [];
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  for (let i = 1; i <= UPCOMING_COUNT; i++) {
    const start = new Date(anchor);
    start.setUTCMonth(start.getUTCMonth() + stride * i);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + stride);
    end.setUTCDate(end.getUTCDate() - 1);
    const startIso = iso(start);
    out.push({
      key: startIso,
      periodStart: startIso,
      periodEnd: iso(end),
      isUpcoming: true,
    });
  }
  return out.reverse();
}
