import type { MatrixMember, MatrixPeriod, PeriodStatsRow } from './charge-detail-types';
import { formatPeriodHeader } from './shared-formatters';

/**
 * Rolls each active period into a `PeriodStatsRow` — paid + owed
 * totals across all members, plus a `paidMembers/totalMembers` split
 * used by the leaderboard. Upcoming periods are excluded (they carry
 * no payment data yet).
 */
export function buildMatrixPeriodStats(
  periods: readonly MatrixPeriod[],
  members: readonly MatrixMember[],
): PeriodStatsRow[] {
  return periods
    .filter((p) => !p.isUpcoming)
    .map((p) => {
      const originalIdx = periods.findIndex((pp) => pp.key === p.key);
      let paid = 0;
      let owed = 0;
      let paidMembers = 0;
      let totalMembers = 0;
      for (const m of members) {
        const c = m.cells[originalIdx];
        if (!c) continue;
        totalMembers += 1;
        paid += c.paid;
        owed += c.owed;
        if (c.owed - c.paid <= 0.0001) paidMembers += 1;
      }
      return {
        key: p.key,
        period: formatPeriodHeader(p),
        Paid: Math.round(paid),
        Outstanding: Math.round(Math.max(0, owed - paid)),
        coverage: owed > 0 ? paid / owed : 0,
        paidMembers,
        totalMembers,
      };
    });
}

/**
 * Distribution of members across paid-share buckets — feeds the
 * coverage histogram card. Buckets are fixed so the chart shape is
 * comparable across charges.
 */
export function buildCoverageDistribution(
  periods: readonly MatrixPeriod[],
  members: readonly MatrixMember[],
) {
  const buckets = [
    { key: '0', label: '0%', min: 0, max: 0.0001, count: 0 },
    { key: '1-25', label: '1–25%', min: 0.0001, max: 0.25, count: 0 },
    { key: '25-50', label: '25–50%', min: 0.25, max: 0.5, count: 0 },
    { key: '50-75', label: '50–75%', min: 0.5, max: 0.75, count: 0 },
    { key: '75-99', label: '75–99%', min: 0.75, max: 0.9999, count: 0 },
    { key: '100', label: '100%', min: 0.9999, max: 1.0001, count: 0 },
  ];
  for (const m of members) {
    const t = m.cells.reduce(
      (acc, c, idx) => {
        const p = periods[idx];
        if (!c || !p || p.isUpcoming) return acc;
        acc.paid += c.paid;
        acc.owed += c.owed;
        return acc;
      },
      { paid: 0, owed: 0 },
    );
    if (t.owed <= 0) continue;
    const cov = Math.min(1, t.paid / t.owed);
    for (const b of buckets) {
      if (cov >= b.min && cov < b.max) {
        b.count += 1;
        break;
      }
    }
  }
  return buckets;
}

/**
 * Per-member paid + outstanding totals sorted paid-desc — the source
 * for both the top-payers panel and the most-behind panel (after a
 * secondary sort). Upcoming periods are excluded.
 */
export interface MemberTotalRow {
  readonly memberId: string;
  readonly name: string;
  readonly paid: number;
  readonly owed: number;
  readonly outstanding: number;
}

export function buildMemberTotals(
  periods: readonly MatrixPeriod[],
  members: readonly MatrixMember[],
): MemberTotalRow[] {
  return members
    .map((m) => {
      const t = m.cells.reduce(
        (acc, c, idx) => {
          const p = periods[idx];
          if (!c || !p || p.isUpcoming) return acc;
          acc.paid += c.paid;
          acc.owed += c.owed;
          return acc;
        },
        { paid: 0, owed: 0 },
      );
      return {
        memberId: m.memberId,
        name: m.fullName,
        paid: t.paid,
        owed: t.owed,
        outstanding: Math.max(0, t.owed - t.paid),
      };
    })
    .sort((a, b) => b.paid - a.paid);
}
