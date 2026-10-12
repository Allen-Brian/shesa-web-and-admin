import type {
  ChargeSummary,
  ChargeTargetPlanRow,
  MatrixMember,
  MatrixPeriod,
  PaymentMethodStat,
  PaymentSourceStat,
  PaymentTimingStats,
  PoolPayment,
  SeriesPoint,
} from '@/app/(personas)/finance/charges/[id]/widgets/charge-detail-types';

/** Pool-branch return shape — payments hit the charge directly. */
export interface PoolChargeDetail {
  readonly summary: ChargeSummary;
  readonly mode: 'pool';
  readonly collected: number;
  readonly payerCount: number;
  readonly poolPayments: readonly PoolPayment[];
  readonly chargeTargets?: readonly ChargeTargetPlanRow[];
  readonly paymentsByMethod: readonly PaymentMethodStat[];
  readonly paymentsBySource: readonly PaymentSourceStat[];
  readonly paymentTiming: PaymentTimingStats;
  readonly cumulativeSeries: readonly SeriesPoint[];
}

/**
 * Matrix-branch return shape — payments settle per-member obligations
 * (`members` variant) or per-scope obligations (`scope-body` variant).
 * The variant selector drives the Reports-tab layout on the client.
 */
export interface MatrixChargeDetail {
  readonly summary: ChargeSummary;
  readonly mode: 'matrix';
  readonly variant: 'members' | 'scope-body';
  readonly expected: number;
  readonly collected: number;
  readonly periods: readonly MatrixPeriod[];
  readonly members: readonly MatrixMember[];
  readonly chargeTargets?: readonly ChargeTargetPlanRow[];
  readonly paymentsByMethod: readonly PaymentMethodStat[];
  readonly paymentsBySource: readonly PaymentSourceStat[];
  readonly paymentTiming: PaymentTimingStats;
  readonly cumulativeSeries: readonly SeriesPoint[];
  readonly paymentLog: readonly PoolPayment[];
}

/** Discriminated union the shared loader returns. */
export type ChargeDetailData = PoolChargeDetail | MatrixChargeDetail;
