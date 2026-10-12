import type { PaymentTimingStats } from './charge-detail-types';
import { ChargeVitalStat } from './charge-vital-stat';
import { formatMoney } from './shared-formatters';

/**
 * Row of 5 headline "vital signs" tiles above the matrix charts:
 * Collection rate · Avg. payment · ARPM · Compliance · Best period.
 * Wraps `ChargeVitalStat` with the specific labels for the members-
 * matrix reports flavour.
 */
export function ChargeVitalSignsStrip({
  currency,
  progress,
  timing,
  arpm,
  fullyPaid,
  totalMembers,
  bestPeriodLabel,
  bestPeriodCoverage,
}: {
  readonly currency: string;
  readonly progress: number;
  readonly timing: PaymentTimingStats;
  readonly arpm: number;
  readonly fullyPaid: number;
  readonly totalMembers: number;
  readonly bestPeriodLabel: string;
  readonly bestPeriodCoverage: number | null;
}) {
  const hasPayments = timing.count > 0;
  const compliance = totalMembers > 0 ? Math.round((fullyPaid / totalMembers) * 100) : null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <ChargeVitalStat label="Collection rate" value={`${progress}%`} hint="of expected" />
      <ChargeVitalStat
        label="Avg. payment"
        value={hasPayments ? formatMoney(timing.avgAmount, currency) : '—'}
        hint={hasPayments ? `Median ${formatMoney(timing.medianAmount, currency)}` : 'no payments'}
      />
      <ChargeVitalStat
        label="ARPM"
        value={totalMembers > 0 ? formatMoney(arpm, currency) : '—'}
        hint="avg collected per member"
      />
      <ChargeVitalStat
        label="Compliance"
        value={compliance !== null ? `${compliance}%` : '—'}
        hint={`${fullyPaid}/${totalMembers} fully paid`}
      />
      <ChargeVitalStat
        label="Best period"
        value={bestPeriodCoverage !== null ? `${Math.round(bestPeriodCoverage)}%` : '—'}
        hint={bestPeriodLabel}
      />
    </div>
  );
}
