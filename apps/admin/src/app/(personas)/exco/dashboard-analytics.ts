import type { AnalyticsData } from './widgets/dashboard-types';
import type { DashboardRawData } from './dashboard-loader-types';
import type { DashboardScopeContext } from './dashboard-scope-context';

interface MonthBucket {
  readonly label: string;
  readonly year: number;
  readonly month: number;
  readonly start: number;
  readonly end: number;
}

function buildMonthBuckets(now: Date): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  const base = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const nextD = new Date(base.getFullYear(), base.getMonth() - i + 1, 1);
    buckets.push({
      label: d.toLocaleString(undefined, { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
      start: d.getTime(),
      end: nextD.getTime(),
    });
  }
  return buckets;
}

/**
 * Compute the 4 twelve-month analytics timelines the dashboard renders:
 * cumulative membership growth, registered/unregistered pie, per-month
 * contributions raised, and per-month charges expected-vs-paid.
 */
export function computeDashboardAnalytics(args: {
  readonly raw: DashboardRawData;
  readonly context: DashboardScopeContext;
}): AnalyticsData {
  const { raw, context } = args;
  const { scopeById, scopedMemberships, scopedCharges, scopedObligations, scopedPayments } =
    context;

  const now = new Date();
  const monthBuckets = buildMonthBuckets(now);

  // 1. Membership growth — cumulative geographic memberships as of the
  //    end of each month.
  const membershipGrowth = monthBuckets.map((b) => {
    const count = scopedMemberships.filter((m) => {
      if (m.membership_status !== 'active' && m.membership_status !== 'passive') return false;
      const s = scopeById.get(m.scope_id);
      if (!s) return false;
      const isGeographic =
        s.scope_type === 'branch' ||
        (s.scope_type === 'chapter' && s.chapter_kind === 'autonomous');
      if (!isGeographic) return false;
      if (!m.joined_at) return false;
      return new Date(m.joined_at).getTime() < b.end;
    }).length;
    return { month: b.label, members: count };
  });

  // 2. Registered vs Unregistered pie — everyone vs those without a
  //    geographic membership. Global set (federation-wide).
  const memberIdsWithGeoMembership = new Set(
    raw.memberships
      .filter((m) => {
        if (m.membership_status !== 'active' && m.membership_status !== 'passive') return false;
        const s = scopeById.get(m.scope_id);
        return (
          s &&
          (s.scope_type === 'branch' ||
            (s.scope_type === 'chapter' && s.chapter_kind === 'autonomous'))
        );
      })
      .map((m) => m.member_id),
  );
  const registered = raw.members.filter((m) => memberIdsWithGeoMembership.has(m.id)).length;
  const unregistered = raw.members.length - registered;
  const registrationPie = [
    { name: 'Registered', value: registered },
    { name: 'Unregistered', value: unregistered },
  ];

  // 3. Contributions raised over 12 months — sum of non-reversal payments
  //    landing on `goal`/`open`/`ticketed` charges each month.
  const contributionShapeChargeIds = new Set(
    scopedCharges
      .filter((c) => c.shape === 'goal' || c.shape === 'open' || c.shape === 'ticketed')
      .map((c) => c.id),
  );
  const contributionsTimeline = monthBuckets.map((b) => {
    let raised = 0;
    for (const p of scopedPayments) {
      if (p.reverses_payment_id) continue;
      if (!p.charge_id || !contributionShapeChargeIds.has(p.charge_id)) continue;
      const t = new Date(p.created_at).getTime();
      if (t >= b.start && t < b.end) raised += p.amount;
    }
    return { month: b.label, raised: Math.round(raised) };
  });

  // 4. Charges expected vs collected — 12-month bars for `charge`/`fixed`
  //    obligations. Expected = period_start falling in the bucket; paid =
  //    payments landing in the bucket for those obligations.
  const chargeShapeChargeIds = new Set(
    scopedCharges.filter((c) => c.shape === 'charge' || c.shape === 'fixed').map((c) => c.id),
  );
  const chargesTimeline = monthBuckets.map((b) => {
    let expected = 0;
    let paid = 0;
    for (const o of scopedObligations) {
      if (!chargeShapeChargeIds.has(o.charge_id)) continue;
      if (!o.period_start) continue;
      const t = new Date(o.period_start).getTime();
      if (t < b.start || t >= b.end) continue;
      expected += o.amount;
    }
    for (const p of scopedPayments) {
      if (!p.obligation_id) continue;
      const t = new Date(p.created_at).getTime();
      if (t < b.start || t >= b.end) continue;
      const oblig = scopedObligations.find((o) => o.id === p.obligation_id);
      if (!oblig || !chargeShapeChargeIds.has(oblig.charge_id)) continue;
      const amt = p.amount;
      paid += p.reverses_payment_id ? -amt : amt;
    }
    return { month: b.label, expected: Math.round(expected), paid: Math.round(paid) };
  });

  return {
    membershipGrowth,
    registrationPie,
    contributionsTimeline,
    chargesTimeline,
  };
}
