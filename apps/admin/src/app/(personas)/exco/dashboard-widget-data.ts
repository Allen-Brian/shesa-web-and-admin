import type {
  AnnouncementItem,
  CalendarEvent,
  ChargeCompletion,
  ContributionRow,
  ContributionsBlock,
  EventItem,
  TopMember,
  Transaction,
} from './widgets/dashboard-types';
import type { DashboardRawData } from './dashboard-loader-types';
import type { DashboardPersona } from './dashboard-persona';
import type { DashboardScopeContext } from './dashboard-scope-context';

const ENGAGEMENT_SCORE: Record<string, number> = {
  committed: 4,
  engaged: 3,
  normal: 2,
  dormant: 1,
};

/**
 * Build the mid-size widget payloads that don't fit under stats /
 * trends / analytics. Each output shape mirrors what the client widget
 * consumes verbatim so page.tsx just spreads them into DashboardProps.
 */
export function computeDashboardWidgetData(args: {
  readonly raw: DashboardRawData;
  readonly persona: DashboardPersona;
  readonly context: DashboardScopeContext;
}): {
  readonly contributions: ContributionsBlock;
  readonly upcomingEvents: readonly EventItem[];
  readonly announcements: readonly AnnouncementItem[];
  readonly topMembers: readonly TopMember[];
  readonly calendarEvents: readonly CalendarEvent[];
  readonly chargesCompletion: readonly ChargeCompletion[];
  readonly latestTransactions: readonly Transaction[];
} {
  const { raw, persona, context } = args;
  const { scopeById, scopedCharges, scopedObligations, scopedPayments, scopedMemberships } =
    context;

  // ── Contributions ────────────────────────────────────
  const rows: ContributionRow[] = scopedCharges
    .filter(
      (c) =>
        (c.shape === 'goal' || c.shape === 'open' || c.shape === 'ticketed') &&
        c.lifecycle === 'open',
    )
    .map((c) => {
      const raised = scopedPayments
        .filter((p) => p.charge_id === c.id && !p.reverses_payment_id)
        .reduce((sum, p) => sum + p.amount, 0);
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

  const contributions: ContributionsBlock = {
    total: rows.reduce((s, r) => s + r.raised, 0),
    currency: rows[0]?.currency ?? '',
    rows,
  };

  // ── Charges completion ────────────────────────────────
  const scopedActiveCharges = scopedCharges.filter(
    (c) => c.status === 'active' && (c.shape === 'charge' || c.shape === 'fixed'),
  );
  const paidByObligation = new Map<string, number>();
  for (const p of scopedPayments) {
    if (!p.obligation_id) continue;
    const amt = p.amount;
    const signed = p.reverses_payment_id ? -amt : amt;
    paidByObligation.set(p.obligation_id, (paidByObligation.get(p.obligation_id) ?? 0) + signed);
  }
  const chargesCompletion: readonly ChargeCompletion[] = scopedActiveCharges
    .map((c) => {
      const chargeObligs = scopedObligations.filter((o) => o.charge_id === c.id);
      const expected = chargeObligs.reduce((s, o) => s + o.amount, 0);
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

  // ── Latest transactions ──────────────────────────────
  const memberById = new Map(raw.members.map((m) => [m.id, m]));
  const latestTransactions: readonly Transaction[] = scopedPayments.slice(0, 20).map((p) => {
    const member = p.payer_member_id ? memberById.get(p.payer_member_id) : null;
    const charge = raw.charges.find((c) => c.id === p.charge_id);
    const meta = (p.metadata ?? {}) as { donor_name?: string; public_donation?: boolean };
    const donorLabel = meta.donor_name ?? (meta.public_donation ? 'Anonymous donor' : null);
    return {
      id: p.id,
      payer: member?.full_name ?? donorLabel ?? '—',
      what: charge?.name ?? '—',
      amount: p.amount,
      currency: p.currency,
      method: p.method,
      isReversal: !!p.reverses_payment_id,
      createdAt: p.created_at,
    };
  });

  // ── Top members by engagement ────────────────────────
  const scoreByMember = new Map<string, number>();
  for (const m of scopedMemberships) {
    if (!m.engagement) continue;
    const s = ENGAGEMENT_SCORE[m.engagement] ?? 0;
    scoreByMember.set(m.member_id, (scoreByMember.get(m.member_id) ?? 0) + s);
  }
  const primaryScopeForMember = new Map<string, { id: string; slug: string }>();
  for (const m of raw.memberships) {
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
  const topMembers: readonly TopMember[] = Array.from(scoreByMember.entries())
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

  // ── Calendar (current month) ─────────────────────────
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const calendarEvents: readonly CalendarEvent[] = context.scopedEvents
    .filter((e) => {
      const d = new Date(e.start_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .map((e) => ({ id: e.id, name: e.name, startAt: e.start_at, types: e.types }));

  // ── Upcoming events (top 5) ──────────────────────────
  const upcomingSource = persona.isGlobalAdmin
    ? raw.events.filter(
        (e) => new Date(e.start_at).getTime() > now.getTime() && e.status === 'published',
      )
    : context.scopedEvents.filter(
        (e) => new Date(e.start_at).getTime() > now.getTime() && e.status === 'published',
      );
  const upcomingEvents: readonly EventItem[] = [...upcomingSource]
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      name: e.name,
      startAt: e.start_at,
      endAt: e.end_at,
      venue: e.venue_name ?? (e.online_url ? 'Online' : null),
      scopeName: scopeById.get(e.owner_scope_id)?.name ?? '—',
      types: e.types,
    }));

  // ── Announcements (top 5) ────────────────────────────
  const announcements: readonly AnnouncementItem[] = context.scopedAnnouncements
    .slice(0, 5)
    .map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      publishedAt: a.published_at,
      scopeName: scopeById.get(a.owner_scope_id)?.name ?? '—',
    }));

  return {
    contributions,
    upcomingEvents,
    announcements,
    topMembers,
    calendarEvents,
    chargesCompletion,
    latestTransactions,
  };
}
