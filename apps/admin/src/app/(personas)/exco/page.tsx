import { redirect } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import { ExcoDashboardView, type DashboardProps } from './widgets/dashboard-view';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Admin — Dashboard' };

interface RawScope {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly scope_type: string;
  readonly chapter_kind: string | null;
  readonly parent_scope_id: string | null;
}

interface RawBranch {
  readonly scope_id: string;
  readonly city: string;
  readonly region: string;
  readonly country_code: string;
}

interface RawMember {
  readonly id: string;
  readonly full_name: string;
  readonly current_city: string | null;
  readonly current_country: string | null;
  readonly created_at: string;
  readonly network_scope_id: string | null;
  readonly house_scope_id: string | null;
}

interface RawMembership {
  readonly member_id: string;
  readonly scope_id: string;
  readonly membership_status: string;
  readonly engagement: string | null;
  readonly joined_at: string | null;
}

interface RawEvent {
  readonly id: string;
  readonly owner_scope_id: string;
  readonly name: string;
  readonly start_at: string;
  readonly end_at: string;
  readonly venue_name: string | null;
  readonly online_url: string | null;
  readonly types: string[];
  readonly status: string;
}

interface RawAnnouncement {
  readonly id: string;
  readonly owner_scope_id: string;
  readonly title: string;
  readonly body: string;
  readonly published_at: string | null;
  readonly status: string;
}

interface RawCharge {
  readonly id: string;
  readonly scope_id: string;
  readonly name: string;
  readonly shape: string;
  readonly base_amount: string | null;
  readonly goal_amount: string | null;
  readonly currency: string;
  readonly status: string;
  readonly lifecycle: string | null;
  readonly close_date: string | null;
  readonly recurrence: string;
}

interface RawObligation {
  readonly id: string;
  readonly charge_id: string;
  readonly scope_id: string;
  readonly amount: string;
  readonly currency: string;
  readonly status: string;
  readonly period_start: string | null;
}

interface RawPayment {
  readonly id: string;
  readonly charge_id: string | null;
  readonly obligation_id: string | null;
  readonly scope_id: string;
  readonly payer_member_id: string | null;
  readonly amount: string;
  readonly currency: string;
  readonly method: string;
  readonly source: string;
  readonly reverses_payment_id: string | null;
  readonly created_at: string;
  readonly metadata: Record<string, unknown> | null;
}

/**
 * Exco Dashboard — the entry-point for the /exco persona.
 *
 * Persona lens:
 *   - Global Admin (mainstream_admin at NULL scope): federation-wide
 *     view — every branch, chapter, member, event, charge.
 *   - Branch / Autonomous-chapter admin: filtered to their own scope(s).
 *     A single "myScopes" set drives every widget's filter.
 *
 * Data loading is one big Promise.all so the page hits the DB in a
 * single flight. Each widget renders from its own slice.
 */
export default async function ExcoDashboardPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/exco');

  // ── Persona detection ────────────────────────────────────────────
  const { data: mainstream } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, name')
    .eq('scope_type', 'mainstream')
    .maybeSingle();

  let isGlobalAdmin = false;
  if (mainstream) {
    const { data } = await supabase.schema('core').rpc('has_permission', {
      p_user_id: user.id,
      p_scope_id: mainstream.id,
      p_permission_key: 'scope.manage_capabilities',
    });
    isGlobalAdmin = data === true;
  }

  // Scoped admin's memberable scopes — branches + autonomous chapters
  // where they hold member.read or above.
  let myScopeIds: string[] = [];
  let firstBranch: RawBranch | null = null;
  let firstScopeName: string | null = null;

  if (!isGlobalAdmin) {
    const { data: grants } = await supabase
      .schema('core')
      .from('role_assignments')
      .select('scope_id, revoked_at, ends_at')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .not('scope_id', 'is', null);
    const now = Date.now();
    myScopeIds = Array.from(
      new Set(
        (
          (grants ?? []) as Array<{
            scope_id: string | null;
            revoked_at: string | null;
            ends_at: string | null;
          }>
        )
          .filter((g) => !g.ends_at || new Date(g.ends_at).getTime() > now)
          .map((g) => g.scope_id!)
          .filter(Boolean),
      ),
    );
  }

  // ── Fan-out queries ──────────────────────────────────────────────
  const [
    { data: allScopesRaw },
    { data: allBranchesRaw },
    { data: allMembersRaw },
    { data: allMembershipsRaw },
    { data: eventsRaw },
    { data: announcementsRaw },
    { data: chargesRaw },
    { data: obligationsRaw },
    { data: paymentsRaw },
  ] = await Promise.all([
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, slug, scope_type, chapter_kind, parent_scope_id'),
    supabase.schema('core').from('branches').select('scope_id, city, region, country_code'),
    supabase
      .schema('core')
      .from('members')
      .select(
        'id, full_name, current_city, current_country, created_at, network_scope_id, house_scope_id',
      ),
    supabase
      .schema('core')
      .from('memberships')
      .select('member_id, scope_id, membership_status, engagement, joined_at')
      .in('membership_status', ['active', 'passive', 'pending']),
    supabase
      .schema('exco' as never)
      .from('events' as never)
      .select('id, owner_scope_id, name, start_at, end_at, venue_name, online_url, types, status')
      .in('status', ['published', 'scheduled'])
      .order('start_at', { ascending: true })
      .limit(50),
    supabase
      .schema('exco' as never)
      .from('announcements' as never)
      .select('id, owner_scope_id, title, body, published_at, status')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(20),
    supabase
      .schema('finance' as never)
      .from('charges' as never)
      .select(
        'id, scope_id, name, shape, base_amount, goal_amount, currency, status, lifecycle, close_date, recurrence',
      ),
    supabase
      .schema('finance' as never)
      .from('obligations' as never)
      .select('id, charge_id, scope_id, amount, currency, status, period_start'),
    supabase
      .schema('finance' as never)
      .from('payments' as never)
      .select(
        'id, charge_id, obligation_id, scope_id, payer_member_id, amount, currency, method, source, reverses_payment_id, created_at, metadata',
      )
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  const allScopes = (allScopesRaw ?? []) as RawScope[];
  const allBranches = (allBranchesRaw ?? []) as RawBranch[];
  const allMembers = (allMembersRaw ?? []) as RawMember[];
  const allMemberships = (allMembershipsRaw ?? []) as RawMembership[];
  const events = (eventsRaw ?? []) as RawEvent[];
  const announcements = (announcementsRaw ?? []) as RawAnnouncement[];
  const charges = (chargesRaw ?? []) as RawCharge[];
  const obligations = (obligationsRaw ?? []) as RawObligation[];
  const payments = (paymentsRaw ?? []) as RawPayment[];

  const scopeById = new Map(allScopes.map((s) => [s.id, s]));

  if (!isGlobalAdmin && myScopeIds.length > 0) {
    const first = allScopes.find((s) => myScopeIds.includes(s.id));
    if (first) {
      firstScopeName = first.name;
      firstBranch = allBranches.find((b) => b.scope_id === first.id) ?? null;
    }
  }

  // ── Persona-scoped slices ────────────────────────────────────────
  const inScope = (scopeId: string): boolean => {
    if (isGlobalAdmin) return true;
    return myScopeIds.includes(scopeId);
  };

  const scopedMemberships = allMemberships.filter((m) => inScope(m.scope_id));
  const scopedEvents = events.filter((e) => inScope(e.owner_scope_id));
  const scopedAnnouncements = announcements.filter((a) => inScope(a.owner_scope_id));
  const scopedCharges = charges.filter((c) => inScope(c.scope_id));
  const scopedObligations = obligations.filter((o) => inScope(o.scope_id));
  const scopedPayments = payments.filter((p) => inScope(p.scope_id));

  // ── Stat computations ───────────────────────────────────────────
  const branchCount = allScopes.filter((s) => s.scope_type === 'branch').length;
  const chapterCount = allScopes.filter((s) => s.scope_type === 'chapter').length;
  const autonomousChapterCount = allScopes.filter(
    (s) => s.scope_type === 'chapter' && s.chapter_kind === 'autonomous',
  ).length;

  const geographicMembershipMemberIds = new Set(
    allMemberships
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
  const totalMembers = allMembers.length;
  const percentMembership =
    totalMembers > 0 ? Math.round((totalMembersInBranchOrChapter / totalMembers) * 100) : 0;

  const now = new Date();
  const upcomingEventsAll = events
    .filter((e) => new Date(e.start_at).getTime() > now.getTime() && e.status === 'published')
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  const upcomingEventsScoped = scopedEvents
    .filter((e) => new Date(e.start_at).getTime() > now.getTime() && e.status === 'published')
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

  // Total collected: net of reversals, aggregated per currency.
  const collectedByCurrency = new Map<string, number>();
  for (const p of scopedPayments) {
    const amt = parseFloat(p.amount);
    const signed = p.reverses_payment_id ? -amt : amt;
    collectedByCurrency.set(p.currency, (collectedByCurrency.get(p.currency) ?? 0) + signed);
  }

  // Branch admin: members in my scope(s)
  const scopedMemberIds = new Set(
    scopedMemberships
      .filter((m) => m.membership_status === 'active' || m.membership_status === 'passive')
      .map((m) => m.member_id),
  );
  const scopedMemberCount = scopedMemberIds.size;

  // Percentage acquisition — branch members / members in same city+country
  let percentAcquisition: number | null = null;
  if (!isGlobalAdmin && firstBranch) {
    const cityMembers = allMembers.filter(
      (m) =>
        m.current_city &&
        firstBranch!.city &&
        m.current_city.toLowerCase() === firstBranch!.city.toLowerCase() &&
        m.current_country &&
        m.current_country.toLowerCase() === firstBranch!.country_code.toLowerCase(),
    ).length;
    percentAcquisition = cityMembers > 0 ? Math.round((scopedMemberCount / cityMembers) * 100) : 0;
  }

  // Charges completion — for each active charge in scope, sum obligations
  // total and paid; overall percent is sum(paid) / sum(expected).
  const scopedActiveCharges = scopedCharges.filter(
    (c) => c.status === 'active' && (c.shape === 'charge' || c.shape === 'fixed'),
  );
  const chargeIdsInScope = new Set(scopedActiveCharges.map((c) => c.id));

  const paidByObligation = new Map<string, number>();
  for (const p of scopedPayments) {
    if (!p.obligation_id) continue;
    const amt = parseFloat(p.amount);
    const signed = p.reverses_payment_id ? -amt : amt;
    paidByObligation.set(p.obligation_id, (paidByObligation.get(p.obligation_id) ?? 0) + signed);
  }

  let expectedSum = 0;
  let paidSum = 0;
  for (const o of scopedObligations) {
    if (!chargeIdsInScope.has(o.charge_id)) continue;
    expectedSum += parseFloat(o.amount);
    paidSum += paidByObligation.get(o.id) ?? 0;
  }
  const percentCompletion = expectedSum > 0 ? Math.round((paidSum / expectedSum) * 100) : 0;

  // New members this month (branch admin's 5th card)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const prevMonthStart = new Date(monthStart);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
  const newMembersThisMonth = scopedMemberships.filter((m) => {
    if (!m.joined_at) return false;
    return new Date(m.joined_at).getTime() >= monthStart.getTime();
  }).length;

  // ── Trend calculations ─────────────────────────────────────────
  // For each trendable metric we compute:
  //   - value at end of previous month
  //   - current value
  //   - percent change (positive = growth)
  // Metrics we skip: upcoming events (future-only), acquisition (no
  // easy historical proxy), branches/chapters (rarely change).
  const percentChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Members at end of previous month = active/passive memberships joined
  // before the start of THIS month. We use member IDs (dedup) to match
  // the "total members" definition above.
  const globalPrevMonthMemberIds = new Set(
    allMemberships
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
          new Date(m.joined_at!).getTime() < monthStart.getTime(),
      )
      .map((m) => m.member_id),
  );
  const scopedMembersTrend = percentChange(scopedMemberCount, scopedPrevMonthMemberIds.size);

  // Payments trend — this month's collected vs last month's, per currency.
  const thisMonthCollected = new Map<string, number>();
  const prevMonthCollected = new Map<string, number>();
  for (const p of scopedPayments) {
    const t = new Date(p.created_at).getTime();
    const amt = parseFloat(p.amount);
    const signed = p.reverses_payment_id ? -amt : amt;
    if (t >= monthStart.getTime()) {
      thisMonthCollected.set(p.currency, (thisMonthCollected.get(p.currency) ?? 0) + signed);
    } else if (t >= prevMonthStart.getTime()) {
      prevMonthCollected.set(p.currency, (prevMonthCollected.get(p.currency) ?? 0) + signed);
    }
  }
  // Trend for the "primary" currency (the largest all-time collected pool)
  const primaryCurrencyForTrend = Array.from(collectedByCurrency.entries()).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];
  const collectedTrend = primaryCurrencyForTrend
    ? percentChange(
        thisMonthCollected.get(primaryCurrencyForTrend) ?? 0,
        prevMonthCollected.get(primaryCurrencyForTrend) ?? 0,
      )
    : 0;

  // Contributions data (open contributions in scope with raised sums)
  const contributionsList = scopedCharges
    .filter(
      (c) =>
        (c.shape === 'goal' || c.shape === 'open' || c.shape === 'ticketed') &&
        c.lifecycle === 'open',
    )
    .map((c) => {
      const raised = scopedPayments
        .filter((p) => p.charge_id === c.id && !p.reverses_payment_id)
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const goal = c.goal_amount ? parseFloat(c.goal_amount) : null;
      return {
        id: c.id,
        name: c.name,
        shape: c.shape,
        raised,
        goal,
        currency: c.currency,
        closeDate: c.close_date,
        scopeName: scopeById.get(c.scope_id)?.name ?? '—',
      };
    })
    .sort((a, b) => b.raised - a.raised)
    .slice(0, 6);

  const totalContributed = contributionsList.reduce((s, c) => s + c.raised, 0);
  const totalContributedCurrency = contributionsList[0]?.currency ?? '';

  // Charges completion rows for widget
  const chargesCompletionRows = scopedActiveCharges
    .map((c) => {
      const chargeObligs = scopedObligations.filter((o) => o.charge_id === c.id);
      const expected = chargeObligs.reduce((s, o) => s + parseFloat(o.amount), 0);
      const paid = chargeObligs.reduce((s, o) => s + (paidByObligation.get(o.id) ?? 0), 0);
      const pct = expected > 0 ? Math.round((paid / expected) * 100) : 0;
      return {
        id: c.id,
        name: c.name,
        scopeName: scopeById.get(c.scope_id)?.name ?? '—',
        expected,
        paid,
        percent: Math.min(100, pct),
        currency: c.currency,
      };
    })
    .filter((r) => r.expected > 0)
    .sort((a, b) => a.percent - b.percent)
    .slice(0, 6);

  // Latest transactions
  const memberById = new Map(allMembers.map((m) => [m.id, m]));
  const latestTransactions = scopedPayments.slice(0, 20).map((p) => {
    const member = p.payer_member_id ? memberById.get(p.payer_member_id) : null;
    const charge = charges.find((c) => c.id === p.charge_id);
    const meta = (p.metadata ?? {}) as { donor_name?: string; public_donation?: boolean };
    const donorLabel = meta.donor_name ?? (meta.public_donation ? 'Anonymous donor' : null);
    return {
      id: p.id,
      payer: member?.full_name ?? donorLabel ?? '—',
      what: charge?.name ?? '—',
      amount: parseFloat(p.amount),
      currency: p.currency,
      method: p.method,
      isReversal: !!p.reverses_payment_id,
      createdAt: p.created_at,
    };
  });

  // Top members by engagement (weighted score). Uses scoped memberships
  // in the scoped case, all in the global case.
  const engagementScore: Record<string, number> = {
    committed: 4,
    engaged: 3,
    normal: 2,
    dormant: 1,
  };
  const scoreByMember = new Map<string, number>();
  for (const m of scopedMemberships) {
    if (!m.engagement) continue;
    const s = engagementScore[m.engagement] ?? 0;
    scoreByMember.set(m.member_id, (scoreByMember.get(m.member_id) ?? 0) + s);
  }
  // For each top member, pick their primary geographic membership scope
  // so the client can link directly to the member profile page. Prefer
  // an in-scope match; fall back to any geographic membership.
  const primaryScopeForMember = new Map<string, { id: string; slug: string }>();
  for (const m of allMemberships) {
    if (primaryScopeForMember.has(m.member_id)) continue;
    if (m.membership_status !== 'active' && m.membership_status !== 'passive') continue;
    const scope = scopeById.get(m.scope_id);
    if (!scope) continue;
    const isGeographic =
      scope.scope_type === 'branch' ||
      (scope.scope_type === 'chapter' && scope.chapter_kind === 'autonomous');
    if (!isGeographic) continue;
    primaryScopeForMember.set(m.member_id, { id: scope.id, slug: scope.slug });
  }

  const topMembers = Array.from(scoreByMember.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([memberId, score]) => {
      const member = memberById.get(memberId);
      const primaryScope = primaryScopeForMember.get(memberId) ?? null;
      return {
        id: memberId,
        name: member?.full_name ?? '(unknown)',
        score,
        city: member?.current_city ?? null,
        country: member?.current_country ?? null,
        scopeSlug: primaryScope?.slug ?? null,
      };
    });

  // Calendar — events happening in the current month
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const calendarEvents = scopedEvents
    .filter((e) => {
      const d = new Date(e.start_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .map((e) => ({
      id: e.id,
      name: e.name,
      startAt: e.start_at,
      types: e.types,
    }));

  // ── Analytics: 12-month monthly buckets ────────────────────────
  // We build a single array of the last 12 calendar months and populate
  // each bucket by walking the relevant records. Server-side means the
  // client just renders the shapes.
  const monthBuckets: Array<{
    label: string;
    year: number;
    month: number;
    start: number;
    end: number;
  }> = [];
  {
    const base = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const nextD = new Date(base.getFullYear(), base.getMonth() - i + 1, 1);
      monthBuckets.push({
        label: d.toLocaleString(undefined, { month: 'short' }),
        year: d.getFullYear(),
        month: d.getMonth(),
        start: d.getTime(),
        end: nextD.getTime(),
      });
    }
  }

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

  // 2. Registered vs Unregistered pie — everyone in scope vs those
  //    without a geographic membership. For global admin: whole federation.
  const memberIdsWithGeoMembership = new Set(
    allMemberships
      .filter(
        (m) =>
          (m.membership_status === 'active' || m.membership_status === 'passive') &&
          (() => {
            const s = scopeById.get(m.scope_id);
            return (
              s &&
              (s.scope_type === 'branch' ||
                (s.scope_type === 'chapter' && s.chapter_kind === 'autonomous'))
            );
          })(),
      )
      .map((m) => m.member_id),
  );
  const registered = allMembers.filter((m) => memberIdsWithGeoMembership.has(m.id)).length;
  const unregistered = allMembers.length - registered;
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
      if (t >= b.start && t < b.end) raised += parseFloat(p.amount);
    }
    return { month: b.label, raised: Math.round(raised) };
  });

  // 4. Charges expected vs collected — 12-month bars, for `charge`/`fixed`
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
      expected += parseFloat(o.amount);
    }
    for (const p of scopedPayments) {
      if (!p.obligation_id) continue;
      const t = new Date(p.created_at).getTime();
      if (t < b.start || t >= b.end) continue;
      const oblig = scopedObligations.find((o) => o.id === p.obligation_id);
      if (!oblig || !chargeShapeChargeIds.has(oblig.charge_id)) continue;
      const amt = parseFloat(p.amount);
      paid += p.reverses_payment_id ? -amt : amt;
    }
    return { month: b.label, expected: Math.round(expected), paid: Math.round(paid) };
  });

  // ── Compose props for the client widget ─────────────────────────
  const props: DashboardProps = {
    isGlobalAdmin,
    scopeLabel: isGlobalAdmin ? 'Federation' : (firstScopeName ?? 'Your scope'),
    stats: isGlobalAdmin
      ? {
          kind: 'global',
          branches: branchCount,
          chapters: chapterCount,
          autonomousChapters: autonomousChapterCount,
          totalMembers: totalMembersInBranchOrChapter,
          allMembers: totalMembers,
          percentMembership,
          upcomingEvents: upcomingEventsAll.length,
          collectedByCurrency: Array.from(collectedByCurrency.entries()).map(([c, a]) => ({
            currency: c,
            amount: a,
          })),
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
        },
    contributions: {
      total: totalContributed,
      currency: totalContributedCurrency,
      rows: contributionsList,
    },
    upcomingEvents: (isGlobalAdmin ? upcomingEventsAll : upcomingEventsScoped)
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        name: e.name,
        startAt: e.start_at,
        endAt: e.end_at,
        venue: e.venue_name ?? (e.online_url ? 'Online' : null),
        scopeName: scopeById.get(e.owner_scope_id)?.name ?? '—',
        types: e.types,
      })),
    announcements: scopedAnnouncements.slice(0, 5).map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      publishedAt: a.published_at,
      scopeName: scopeById.get(a.owner_scope_id)?.name ?? '—',
    })),
    topMembers,
    calendarEvents,
    chargesCompletion: chargesCompletionRows,
    latestTransactions,
    analytics: {
      membershipGrowth,
      registrationPie,
      contributionsTimeline,
      chargesTimeline,
    },
    userName: (user.user_metadata?.display_name as string | undefined) ?? user.email ?? 'there',
  };

  return <ExcoDashboardView {...props} />;
}
