import 'server-only';

import type {
  ChargeSummary,
  MatrixMember,
  MatrixPeriod,
  PaymentMethodStat,
  PaymentSourceStat,
  PaymentTimingStats,
  PoolPayment,
  SeriesPoint,
} from '@/app/(personas)/finance/charges/[id]/widgets/charge-detail-types';
import { getServerClient } from '@/lib/supabase-server';

/**
 * Shared server-side loader for the charge-detail drill-down.
 *
 * Both the Finance persona (/finance/charges/[id]) and the Exco
 * global-admin's read-only mirror (/exco/finance-view/charges/[id])
 * use this. Keeping the query shape in one place avoids two subtly
 * divergent copies as the finance model grows.
 *
 * Returns `null` when the row is missing or invisible to the caller
 * (RLS + siloed admin lens). Pages should `notFound()` on null.
 *
 * The loader also produces:
 *   • `upcomingPeriods` — future cycles derived from the charge's
 *     recurrence, so the collection table can auto-render the
 *     next N periods in an "Upcoming" state before any obligations
 *     have been generated for them (E14 obligation-generator territory).
 *   • `paymentsByMethod` — count + amount per method for the donut
 *     on the Reports tab.
 *   • `cumulativeSeries` — a running total of collected amount over
 *     time, one point per day that had a settled payment. Powers the
 *     "Collection curve" chart.
 */

interface RawCharge {
  readonly id: string;
  readonly scope_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly shape: string;
  readonly base_amount: string | null;
  readonly goal_amount: string | null;
  readonly currency: string;
  readonly recurrence: string;
  readonly recurrence_interval: number;
  readonly status: string;
  readonly lifecycle: string | null;
  readonly activation_date: string | null;
  readonly open_date: string | null;
  readonly close_date: string | null;
  readonly created_at: string;
}

interface RawObligation {
  readonly id: string;
  readonly charge_id: string;
  readonly party_type: string;
  readonly party_id: string;
  readonly amount: string;
  readonly currency: string;
  readonly status: string;
  readonly period_start: string | null;
  readonly period_end: string | null;
  readonly prorated: boolean;
}

interface RawPayment {
  readonly id: string;
  readonly obligation_id: string | null;
  readonly charge_id: string | null;
  readonly payer_member_id: string | null;
  readonly amount: string;
  readonly currency: string;
  readonly method: string;
  readonly source: string;
  readonly reverses_payment_id: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly created_at: string;
}

export type ChargeDetailData =
  | {
      readonly summary: ChargeSummary;
      readonly mode: 'pool';
      readonly collected: number;
      readonly payerCount: number;
      readonly poolPayments: readonly PoolPayment[];
      readonly paymentsByMethod: readonly PaymentMethodStat[];
      readonly paymentsBySource: readonly PaymentSourceStat[];
      readonly paymentTiming: PaymentTimingStats;
      readonly cumulativeSeries: readonly SeriesPoint[];
    }
  | {
      readonly summary: ChargeSummary;
      readonly mode: 'matrix';
      readonly variant: 'members' | 'scope-body';
      readonly expected: number;
      readonly collected: number;
      readonly periods: readonly MatrixPeriod[];
      readonly members: readonly MatrixMember[];
      readonly paymentsByMethod: readonly PaymentMethodStat[];
      readonly paymentsBySource: readonly PaymentSourceStat[];
      readonly paymentTiming: PaymentTimingStats;
      readonly cumulativeSeries: readonly SeriesPoint[];
      readonly paymentLog: readonly PoolPayment[];
    };

const UPCOMING_COUNT = 3;
const RECURRENCE_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  biannual: 6,
  yearly: 12,
};

export async function loadChargeDetail(id: string): Promise<ChargeDetailData | null> {
  const supabase = await getServerClient();

  const { data: chargeRaw } = await supabase
    .schema('finance' as never)
    .from('charges' as never)
    .select(
      'id, scope_id, name, description, shape, base_amount, goal_amount, currency, recurrence, recurrence_interval, status, lifecycle, activation_date, open_date, close_date, created_at',
    )
    .eq('id', id)
    .maybeSingle();

  const charge = chargeRaw as RawCharge | null;
  if (!charge) return null;

  const { data: scopeRow } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, name, slug')
    .eq('id', charge.scope_id)
    .maybeSingle();

  const summary: ChargeSummary = {
    id: charge.id,
    name: charge.name,
    description: charge.description,
    scopeName: scopeRow?.name ?? '—',
    scopeSlug: (scopeRow?.slug as string | undefined) ?? '',
    shape: charge.shape,
    baseAmount: charge.base_amount ? parseFloat(charge.base_amount) : null,
    goalAmount: charge.goal_amount ? parseFloat(charge.goal_amount) : null,
    currency: charge.currency,
    recurrence: charge.recurrence,
    recurrenceInterval: charge.recurrence_interval,
    status: charge.status,
    lifecycle: charge.lifecycle,
    activationDate: charge.activation_date,
    openDate: charge.open_date,
    closeDate: charge.close_date,
    createdAt: charge.created_at,
  };

  const isObligationBased = charge.shape === 'charge' || charge.shape === 'fixed';

  if (!isObligationBased) {
    // ── Pool-style ─────────────────────────────────────────────────
    const { data: paymentsRaw } = await supabase
      .schema('finance' as never)
      .from('payments' as never)
      .select(
        'id, obligation_id, charge_id, payer_member_id, amount, currency, method, source, reverses_payment_id, metadata, created_at',
      )
      .eq('charge_id', id)
      .order('created_at', { ascending: false });

    const payments = (paymentsRaw ?? []) as RawPayment[];
    const memberIds = Array.from(
      new Set(payments.map((p) => p.payer_member_id).filter((x): x is string => !!x)),
    );
    const { data: memberRows } = memberIds.length
      ? await supabase.schema('core').from('members').select('id, full_name').in('id', memberIds)
      : { data: [] as Array<{ id: string; full_name: string }> };
    const memberById = new Map(
      ((memberRows ?? []) as Array<{ id: string; full_name: string }>).map((m) => [
        m.id,
        m.full_name,
      ]),
    );

    let collected = 0;
    for (const p of payments) {
      const amt = parseFloat(p.amount);
      collected += p.reverses_payment_id ? -amt : amt;
    }

    const poolPayments: PoolPayment[] = payments.map((p) => {
      const meta = (p.metadata ?? {}) as { donor_name?: string; public_donation?: boolean };
      const donorLabel = meta.donor_name ?? (meta.public_donation ? 'Anonymous donor' : null);
      return {
        id: p.id,
        payerLabel:
          (p.payer_member_id ? memberById.get(p.payer_member_id) : null) ?? donorLabel ?? '—',
        amount: parseFloat(p.amount),
        currency: p.currency,
        method: p.method,
        source: p.source,
        isReversal: !!p.reverses_payment_id,
        createdAt: p.created_at,
      };
    });

    return {
      summary,
      mode: 'pool',
      collected,
      payerCount: new Set(
        payments.filter((p) => !p.reverses_payment_id).map((p) => p.payer_member_id),
      ).size,
      poolPayments,
      paymentsByMethod: aggregateByMethod(payments),
      paymentsBySource: aggregateBySource(payments),
      paymentTiming: computeTimingStats(payments),
      cumulativeSeries: buildCumulativeSeries(payments),
    };
  }

  // ── Obligation-based (matrix) ──────────────────────────────────────
  const { data: obligationsRaw } = await supabase
    .schema('finance' as never)
    .from('obligations' as never)
    .select(
      'id, charge_id, party_type, party_id, amount, currency, status, period_start, period_end, prorated',
    )
    .eq('charge_id', id);

  const obligations = (obligationsRaw ?? []) as RawObligation[];
  const obligationIds = obligations.map((o) => o.id);

  const { data: paymentsRaw } = obligationIds.length
    ? await supabase
        .schema('finance' as never)
        .from('payments' as never)
        .select(
          'id, obligation_id, charge_id, payer_member_id, amount, currency, method, source, reverses_payment_id, metadata, created_at',
        )
        .in('obligation_id', obligationIds)
    : { data: [] as RawPayment[] };
  const payments = (paymentsRaw ?? []) as RawPayment[];

  const paidByObligation = new Map<string, number>();
  for (const p of payments) {
    if (!p.obligation_id) continue;
    const amt = parseFloat(p.amount);
    const signed = p.reverses_payment_id ? -amt : amt;
    paidByObligation.set(p.obligation_id, (paidByObligation.get(p.obligation_id) ?? 0) + signed);
  }

  const memberIds = Array.from(
    new Set(obligations.filter((o) => o.party_type === 'member').map((o) => o.party_id)),
  );
  const { data: memberRows } = memberIds.length
    ? await supabase.schema('core').from('members').select('id, full_name').in('id', memberIds)
    : { data: [] as Array<{ id: string; full_name: string }> };
  const memberById = new Map(
    ((memberRows ?? []) as Array<{ id: string; full_name: string }>).map((m) => [
      m.id,
      m.full_name,
    ]),
  );

  // Each member's earliest active/passive membership joined_at at the
  // charge's scope. Used by the matrix view to render "Not applicable"
  // for periods that predate the member joining — so a member who joined
  // in March doesn't show up as "unpaid" for January and February.
  const { data: memberMembershipRows } = memberIds.length
    ? await supabase
        .schema('core')
        .from('memberships')
        .select('member_id, joined_at, membership_status')
        .eq('scope_id', charge.scope_id)
        .in('member_id', memberIds)
        .in('membership_status', ['active', 'passive'])
    : {
        data: [] as Array<{
          member_id: string;
          joined_at: string | null;
          membership_status: string;
        }>,
      };
  const joinedAtByMember = new Map<string, string | null>();
  for (const m of (memberMembershipRows ?? []) as Array<{
    member_id: string;
    joined_at: string | null;
  }>) {
    const prev = joinedAtByMember.get(m.member_id);
    if (!m.joined_at) continue;
    if (!prev || new Date(m.joined_at).getTime() < new Date(prev).getTime()) {
      joinedAtByMember.set(m.member_id, m.joined_at);
    }
  }

  // Scope-as-a-body obligations. Global levies against a branch,
  // chapter, or batch land in obligations with party_type='branch'
  // (the party_type enum uses 'branch' as the umbrella "scope owes")
  // and party_id pointing at the scope. Load the scope names so these
  // rows render with their real label instead of a raw UUID.
  const scopeBodyIds = Array.from(
    new Set(obligations.filter((o) => o.party_type === 'branch').map((o) => o.party_id)),
  );
  const { data: scopeBodyRows } = scopeBodyIds.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, scope_type')
        .in('id', scopeBodyIds)
    : { data: [] as Array<{ id: string; name: string; scope_type: string }> };
  const scopeBodyById = new Map(
    ((scopeBodyRows ?? []) as Array<{ id: string; name: string; scope_type: string }>).map((s) => [
      s.id,
      s,
    ]),
  );

  const existingKeys = Array.from(
    new Set(obligations.map((o) => o.period_start ?? 'one-off')),
  ).sort();

  // Chronological ascending: furthest past on the left, current period
  // near the middle, upcoming periods on the right. The widget then
  // auto-scrolls the matrix table so the current period sits in view
  // with roughly three columns of past + three of future visible at
  // once — see the `currentPeriodKey` hint below.
  const periods: MatrixPeriod[] = existingKeys.map((key) => {
    const anyOb = obligations.find((o) => (o.period_start ?? 'one-off') === key);
    return {
      key,
      periodStart: anyOb?.period_start ?? null,
      periodEnd: anyOb?.period_end ?? null,
      isUpcoming: false,
    };
  });

  const upcoming = generateUpcomingPeriods(charge, existingKeys).slice().reverse(); // generateUpcomingPeriods returns furthest-first; we
  // want ascending here so they sit to the right of the
  // matrix in chronological order.
  const allPeriods: MatrixPeriod[] = [...periods, ...upcoming];

  const buildCells = (partyObligations: readonly RawObligation[]) =>
    allPeriods.map((p) => {
      if (p.isUpcoming) return null;
      const ob = partyObligations.find((o) => (o.period_start ?? 'one-off') === p.key);
      if (!ob) return null;
      const paid = paidByObligation.get(ob.id) ?? 0;
      const owed = parseFloat(ob.amount);
      return {
        obligationId: ob.id,
        owed,
        paid,
        currency: ob.currency,
        status: ob.status,
        prorated: ob.prorated,
        periodEnd: ob.period_end,
      };
    });

  const memberRows2: MatrixMember[] = memberIds.map((mid) => ({
    memberId: mid,
    fullName: memberById.get(mid) ?? '(unknown)',
    joinedAt: joinedAtByMember.get(mid) ?? null,
    cells: buildCells(obligations.filter((o) => o.party_id === mid && o.party_type === 'member')),
  }));

  const scopeBodyRows2: MatrixMember[] = scopeBodyIds.map((sid) => {
    const scope = scopeBodyById.get(sid);
    return {
      memberId: sid,
      fullName: scope?.name ?? '(unknown scope)',
      cells: buildCells(obligations.filter((o) => o.party_id === sid && o.party_type === 'branch')),
      isScopeBody: true,
      scopeType: scope?.scope_type ?? null,
    };
  });

  // Scope-body rows first — they represent a collective obligation
  // that supersedes individual coverage in most operator scans.
  const members: MatrixMember[] = [
    ...scopeBodyRows2,
    ...memberRows2.sort((a, b) => a.fullName.localeCompare(b.fullName)),
  ];

  const totals = obligations.reduce(
    (acc, o) => {
      acc.expected += parseFloat(o.amount);
      const paid = paidByObligation.get(o.id) ?? 0;
      acc.collected += paid;
      return acc;
    },
    { expected: 0, collected: 0 },
  );

  // Variant selector — if every obligation targets a scope-as-a-body
  // (no per-member fan-out), the Reports tab drops the coverage /
  // top-payers panels and emphasises the payment log instead.
  const hasMemberObligations = obligations.some((o) => o.party_type === 'member');
  const hasScopeBodyObligations = obligations.some((o) => o.party_type === 'branch');
  const variant: 'members' | 'scope-body' =
    !hasMemberObligations && hasScopeBodyObligations ? 'scope-body' : 'members';

  // Payment log — flat list of settled + reversal rows, sorted newest
  // first. Resolves payer labels from the members join we already ran.
  // `obligationId` lets the scope-body Collection timeline pair each
  // payment to the period cell it settled.
  const paymentLog: PoolPayment[] = payments
    .map((p) => ({
      id: p.id,
      payerLabel:
        (p.payer_member_id ? memberById.get(p.payer_member_id) : null) ??
        (() => {
          const meta = (p.metadata ?? {}) as { donor_name?: string; public_donation?: boolean };
          return meta.donor_name ?? (meta.public_donation ? 'Anonymous donor' : '—');
        })(),
      amount: parseFloat(p.amount),
      currency: p.currency,
      method: p.method,
      source: p.source,
      isReversal: !!p.reverses_payment_id,
      createdAt: p.created_at,
      obligationId: p.obligation_id,
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return {
    summary,
    mode: 'matrix',
    variant,
    expected: totals.expected,
    collected: totals.collected,
    periods: allPeriods,
    members,
    paymentsByMethod: aggregateByMethod(payments),
    paymentsBySource: aggregateBySource(payments),
    paymentTiming: computeTimingStats(payments),
    cumulativeSeries: buildCumulativeSeries(payments),
    paymentLog,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function aggregateByMethod(payments: readonly RawPayment[]): readonly PaymentMethodStat[] {
  const agg = new Map<string, { count: number; amount: number }>();
  for (const p of payments) {
    if (p.reverses_payment_id) continue;
    const key = p.method;
    const cur = agg.get(key) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += parseFloat(p.amount);
    agg.set(key, cur);
  }
  return Array.from(agg.entries())
    .map(([method, s]) => ({ method, count: s.count, amount: s.amount }))
    .sort((a, b) => b.amount - a.amount);
}

function aggregateBySource(payments: readonly RawPayment[]): readonly PaymentSourceStat[] {
  const agg = new Map<string, { count: number; amount: number }>();
  for (const p of payments) {
    if (p.reverses_payment_id) continue;
    const key = p.source;
    const cur = agg.get(key) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += parseFloat(p.amount);
    agg.set(key, cur);
  }
  return Array.from(agg.entries())
    .map(([source, s]) => ({ source, count: s.count, amount: s.amount }))
    .sort((a, b) => b.amount - a.amount);
}

function computeTimingStats(payments: readonly RawPayment[]): PaymentTimingStats {
  const settled = payments.filter((p) => !p.reverses_payment_id);
  if (settled.length === 0) {
    return { count: 0, avgAmount: 0, medianAmount: 0, lastPaymentAt: null };
  }
  const amounts = settled.map((p) => parseFloat(p.amount)).sort((a, b) => a - b);
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

function buildCumulativeSeries(payments: readonly RawPayment[]): readonly SeriesPoint[] {
  const perDay = new Map<string, number>();
  for (const p of payments) {
    const day = p.created_at.slice(0, 10);
    const amt = parseFloat(p.amount);
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

function generateUpcomingPeriods(
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
  // Chronological order — upcoming periods furthest in the future
  // sit on the right end of the matrix.
  return out.reverse();
}
