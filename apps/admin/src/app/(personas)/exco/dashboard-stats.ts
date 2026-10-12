import type { GlobalStats, ScopedStats } from './widgets/dashboard-types';
import type { DashboardRawData, RawBranch } from './dashboard-loader-types';
import type { DashboardPersona } from './dashboard-persona';
import type { DashboardScopeContext } from './dashboard-scope-context';

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Compute the persona-aware stats card block + the trend badges below
 * each card. Global admin gets 5 federation-wide numbers; scoped admins
 * get the 5 that mean something at their scope.
 */
export function computeDashboardStats(args: {
  readonly raw: DashboardRawData;
  readonly persona: DashboardPersona;
  readonly context: DashboardScopeContext;
  readonly firstBranch: RawBranch | null;
}): {
  readonly stats: GlobalStats | ScopedStats;
  readonly totalMembersInBranchOrChapter: number;
  readonly collectedByCurrency: readonly { currency: string; amount: number }[];
  readonly monthStart: Date;
  readonly prevMonthStart: Date;
} {
  const { raw, persona, context, firstBranch } = args;
  const { scopeById, scopedMemberships, scopedPayments } = context;

  const branchCount = raw.scopes.filter((s) => s.scope_type === 'branch').length;
  const chapterCount = raw.scopes.filter((s) => s.scope_type === 'chapter').length;
  const autonomousChapterCount = raw.scopes.filter(
    (s) => s.scope_type === 'chapter' && s.chapter_kind === 'autonomous',
  ).length;

  // Global geographic-membership set: members with an active/passive
  // membership at a branch or autonomous chapter.
  const geographicMembershipMemberIds = new Set(
    raw.memberships
      .filter((m) => {
        const s = scopeById.get(m.scope_id);
        return (
          s &&
          (s.scope_type === 'branch' ||
            (s.scope_type === 'chapter' && s.chapter_kind === 'autonomous'))
        );
      })
      .filter((m) => m.membership_status === 'active' || m.membership_status === 'passive')
      .map((m) => m.member_id),
  );
  const totalMembersInBranchOrChapter = geographicMembershipMemberIds.size;
  const totalMembers = raw.members.length;
  const percentMembership =
    totalMembers > 0 ? Math.round((totalMembersInBranchOrChapter / totalMembers) * 100) : 0;

  const now = new Date();
  const upcomingEventsAll = raw.events.filter(
    (e) => new Date(e.start_at).getTime() > now.getTime() && e.status === 'published',
  );
  const upcomingEventsScoped = context.scopedEvents.filter(
    (e) => new Date(e.start_at).getTime() > now.getTime() && e.status === 'published',
  );

  // Total collected: net of reversals, aggregated per currency.
  const collectedByCurrencyMap = new Map<string, number>();
  for (const p of scopedPayments) {
    const amt = p.amount;
    const signed = p.reverses_payment_id ? -amt : amt;
    collectedByCurrencyMap.set(p.currency, (collectedByCurrencyMap.get(p.currency) ?? 0) + signed);
  }
  const collectedByCurrency = Array.from(collectedByCurrencyMap.entries()).map(([c, a]) => ({
    currency: c,
    amount: a,
  }));

  const scopedMemberIds = new Set(
    scopedMemberships
      .filter((m) => m.membership_status === 'active' || m.membership_status === 'passive')
      .map((m) => m.member_id),
  );
  const scopedMemberCount = scopedMemberIds.size;

  // Percentage acquisition — branch members / members in same city+country
  let percentAcquisition: number | null = null;
  if (!persona.isGlobalAdmin && firstBranch) {
    const cityMembers = raw.members.filter(
      (m) =>
        m.current_city &&
        firstBranch.city &&
        m.current_city.toLowerCase() === firstBranch.city.toLowerCase() &&
        m.current_country &&
        m.current_country.toLowerCase() === firstBranch.country_code.toLowerCase(),
    ).length;
    percentAcquisition = cityMembers > 0 ? Math.round((scopedMemberCount / cityMembers) * 100) : 0;
  }

  // Charges completion for the scoped stats card.
  const scopedActiveCharges = context.scopedCharges.filter(
    (c) => c.status === 'active' && (c.shape === 'charge' || c.shape === 'fixed'),
  );
  const chargeIdsInScope = new Set(scopedActiveCharges.map((c) => c.id));
  const paidByObligation = new Map<string, number>();
  for (const p of scopedPayments) {
    if (!p.obligation_id) continue;
    const amt = p.amount;
    const signed = p.reverses_payment_id ? -amt : amt;
    paidByObligation.set(p.obligation_id, (paidByObligation.get(p.obligation_id) ?? 0) + signed);
  }
  let expectedSum = 0;
  let paidSum = 0;
  for (const o of context.scopedObligations) {
    if (!chargeIdsInScope.has(o.charge_id)) continue;
    expectedSum += o.amount;
    paidSum += paidByObligation.get(o.id) ?? 0;
  }
  const percentCompletion = expectedSum > 0 ? Math.round((paidSum / expectedSum) * 100) : 0;

  // New members this month (branch admin's 5th card)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const prevMonthStart = new Date(monthStart);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
  const newMembersThisMonth = scopedMemberships.filter(
    (m) => m.joined_at && new Date(m.joined_at).getTime() >= monthStart.getTime(),
  ).length;

  // ── Trends ────────────────────────────────────────────
  const globalPrevMonthMemberIds = new Set(
    raw.memberships
      .filter((m) => {
        const s = scopeById.get(m.scope_id);
        if (!s) return false;
        const isGeographic =
          s.scope_type === 'branch' ||
          (s.scope_type === 'chapter' && s.chapter_kind === 'autonomous');
        if (!isGeographic) return false;
        if (m.membership_status !== 'active' && m.membership_status !== 'passive') return false;
        if (!m.joined_at) return false;
        return new Date(m.joined_at).getTime() < monthStart.getTime();
      })
      .map((m) => m.member_id),
  );
  const globalMembersTrend = percentChange(
    totalMembersInBranchOrChapter,
    globalPrevMonthMemberIds.size,
  );

  const scopedPrevMonthMemberIds = new Set(
    scopedMemberships
      .filter(
        (m) =>
          (m.membership_status === 'active' || m.membership_status === 'passive') &&
          m.joined_at &&
          new Date(m.joined_at).getTime() < monthStart.getTime(),
      )
      .map((m) => m.member_id),
  );
  const scopedMembersTrend = percentChange(scopedMemberCount, scopedPrevMonthMemberIds.size);

  const thisMonthCollected = new Map<string, number>();
  const prevMonthCollected = new Map<string, number>();
  for (const p of scopedPayments) {
    const t = new Date(p.created_at).getTime();
    const amt = p.amount;
    const signed = p.reverses_payment_id ? -amt : amt;
    if (t >= monthStart.getTime()) {
      thisMonthCollected.set(p.currency, (thisMonthCollected.get(p.currency) ?? 0) + signed);
    } else if (t >= prevMonthStart.getTime()) {
      prevMonthCollected.set(p.currency, (prevMonthCollected.get(p.currency) ?? 0) + signed);
    }
  }
  const primaryCurrencyForTrend = collectedByCurrency.length
    ? [...collectedByCurrency].sort((a, b) => b.amount - a.amount)[0]!.currency
    : undefined;
  const collectedTrend = primaryCurrencyForTrend
    ? percentChange(
        thisMonthCollected.get(primaryCurrencyForTrend) ?? 0,
        prevMonthCollected.get(primaryCurrencyForTrend) ?? 0,
      )
    : 0;

  const stats: GlobalStats | ScopedStats = persona.isGlobalAdmin
    ? {
        kind: 'global',
        branches: branchCount,
        chapters: chapterCount,
        autonomousChapters: autonomousChapterCount,
        totalMembers: totalMembersInBranchOrChapter,
        allMembers: totalMembers,
        percentMembership,
        upcomingEvents: upcomingEventsAll.length,
        collectedByCurrency,
        trends: {
          totalMembers: globalMembersTrend,
          collected: collectedTrend,
        },
      }
    : {
        kind: 'scoped',
        members: scopedMemberCount,
        percentCompletion,
        upcomingEvents: upcomingEventsScoped.length,
        percentAcquisition,
        newMembersThisMonth,
        trends: {
          members: scopedMembersTrend,
          collected: collectedTrend,
        },
      };

  return {
    stats,
    totalMembersInBranchOrChapter,
    collectedByCurrency,
    monthStart,
    prevMonthStart,
  };
}
