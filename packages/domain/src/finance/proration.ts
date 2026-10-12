/**
 * Proration math for mid-period joiners.
 *
 * Spec Part VI: "A member joining mid-cycle on a recurring charge owes
 * a prorated amount for the partial period."
 *
 * Rules (locked here — the SQL helper mirrors them):
 *
 *   1. If the member joined at or before period.start → full amount.
 *   2. If the member joined during the period → amount * (days_owed / days_in_period),
 *      where days_owed = daysBetween(joinDate, period.end).
 *   3. If the member joined at or after period.end → no obligation (skip).
 *
 * We do NOT prorate for members who left mid-period. Once an obligation
 * is generated it's frozen (M1 trigger). If someone leaves halfway
 * through their monthly cycle they still owe that month's full amount —
 * a paid-so-far arrears settlement is a report / manual reconcile
 * concern, not an obligation-math concern.
 *
 * Rounding: half-up to 2 decimals. This matches how the finance
 * secretary reads amounts (25,000 XAF, 12,500 XAF) and how paper
 * receipts show them.
 */

import { daysBetween, type Period } from './periods';

export type ProrationOutcome =
  | { readonly kind: 'skip'; readonly reason: 'joined_after_period' | 'joined_after_end' }
  | { readonly kind: 'full'; readonly amount: number }
  | {
      readonly kind: 'prorated';
      readonly amount: number;
      readonly daysOwed: number;
      readonly daysInPeriod: number;
    };

export function prorate(
  baseAmount: number,
  period: Period,
  memberJoinDate: Date,
): ProrationOutcome {
  if (baseAmount < 0) {
    throw new Error(`prorate: baseAmount must be >= 0 (got ${baseAmount})`);
  }
  if (period.end.getTime() <= period.start.getTime()) {
    throw new Error('prorate: period.end must be strictly after period.start');
  }

  if (memberJoinDate.getTime() >= period.end.getTime()) {
    return { kind: 'skip', reason: 'joined_after_period' };
  }

  if (memberJoinDate.getTime() <= period.start.getTime()) {
    return { kind: 'full', amount: roundToCents(baseAmount) };
  }

  const daysInPeriod = daysBetween(period.start, period.end);
  const daysOwed = daysBetween(memberJoinDate, period.end);

  // Guard against zero-day periods (shouldn't happen post the invariant
  // above, but defensiveness costs nothing).
  if (daysInPeriod <= 0) {
    return { kind: 'full', amount: roundToCents(baseAmount) };
  }

  const rawAmount = (baseAmount * daysOwed) / daysInPeriod;
  return {
    kind: 'prorated',
    amount: roundToCents(rawAmount),
    daysOwed,
    daysInPeriod,
  };
}

function roundToCents(value: number): number {
  // Standard commercial rounding — round half-up. JS's Math.round is
  // half-to-even for negative numbers but half-up for positive, which
  // matches what a finance secretary expects.
  return Math.round(value * 100) / 100;
}
