/**
 * Row + summary shapes for an event group's report dashboard.
 *
 * The rows are deliberately flat and already joined (charge name, payer
 * name, category name resolved server-side). Every panel on the
 * dashboard reduces the same two arrays, so a shape that needs a lookup
 * map to be readable would have every panel carrying one.
 *
 * Reversals are kept as their own rows rather than netted off during
 * loading. Whether a reversal counts depends on the question: it must
 * be netted out of "money raised" and it must stay visible in "what
 * happened on the 14th". Netting early would answer the first question
 * and destroy the second.
 */

export interface GroupPaymentRow {
  readonly id: string;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  /** `'auto'` for website payments, anything else is a manual entry. */
  readonly source: string;
  readonly chargeId: string | null;
  readonly chargeName: string;
  readonly chargeShape: string | null;
  readonly payerLabel: string;
  readonly isMember: boolean;
  readonly isReversal: boolean;
  readonly reconciled: boolean;
  readonly createdAt: string;
}

export interface GroupExpenseRow {
  readonly id: string;
  readonly amount: number;
  readonly currency: string;
  readonly categoryName: string;
  readonly payee: string;
  readonly status: string;
  readonly isReversal: boolean;
  readonly incurredAt: string;
}

/** One charge in the group, with what it was meant to raise. */
export interface GroupChargeRow {
  readonly id: string;
  readonly name: string;
  readonly shape: string;
  /** Sum of obligations raised. Zero for charges that raise none. */
  readonly expected: number;
}

export interface GroupReportData {
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly status: string;
  readonly startsOn: string | null;
  readonly endsOn: string | null;
  readonly currency: string;
  readonly payments: readonly GroupPaymentRow[];
  readonly expenses: readonly GroupExpenseRow[];
  readonly charges: readonly GroupChargeRow[];
}

/** A point on the day-by-day money curve. */
export interface DayPoint {
  /** ISO date, `YYYY-MM-DD`. */
  readonly date: string;
  readonly income: number;
  readonly expense: number;
  readonly cumulativeIncome: number;
  readonly cumulativeNet: number;
}

export interface NamedValue {
  readonly name: string;
  readonly value: number;
  readonly count: number;
}

export interface ChargePerformance {
  readonly name: string;
  readonly shape: string;
  readonly collected: number;
  readonly expected: number;
  readonly payers: number;
  /** `collected / expected`, or null when the charge raises no obligations. */
  readonly coverage: number | null;
}

export interface TopPayer {
  readonly name: string;
  readonly total: number;
  readonly payments: number;
  readonly isMember: boolean;
}

export interface GroupInsights {
  readonly income: number;
  readonly expenses: number;
  readonly net: number;
  readonly paymentCount: number;
  readonly payerCount: number;
  readonly averageGift: number;
  readonly reconciledAmount: number;
  readonly reconciledShare: number;
  readonly expected: number;
  readonly coverage: number | null;
  readonly busiestDay: DayPoint | null;
  readonly daysActive: number;
  readonly series: readonly DayPoint[];
  readonly byCharge: readonly ChargePerformance[];
  readonly byMethod: readonly NamedValue[];
  readonly byChannel: readonly NamedValue[];
  readonly byCategory: readonly NamedValue[];
  readonly topPayers: readonly TopPayer[];
}
