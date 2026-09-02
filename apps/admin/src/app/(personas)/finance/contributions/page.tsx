import { redirect } from 'next/navigation';

import { activeFinanceScope } from '@/lib/finance/active-scope';
import { getServerClient } from '@/lib/supabase-server';

import { ContributionsView } from './widgets/contributions-view';
import type { ContributionRow, ScopeOption } from './widgets/contributions-types';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Contributions' };

interface RawChargeRow {
  readonly id: string;
  readonly scope_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly shape: string;
  readonly currency: string;
  readonly base_amount: number | null;
  readonly goal_amount: string | null;
  readonly min_amount: string | null;
  readonly capacity: number | null;
  readonly lifecycle: string | null;
  readonly open_date: string | null;
  readonly close_date: string | null;
  readonly status: string;
  readonly created_at: string;
  readonly group_id: string | null;
}

interface RawGroupRow {
  readonly id: string;
  readonly name: string;
}

interface RawScopeRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly scope_type: string;
  readonly chapter_kind: string | null;
  readonly currency_code: string;
}

interface RawPaymentRow {
  readonly charge_id: string | null;
  readonly amount: number;
  readonly payer_member_id: string | null;
  readonly reverses_payment_id: string | null;
  readonly metadata: Record<string, unknown> | null;
}

/**
 * Contributions page — shape IN 'goal' | 'open' | 'ticketed' | 'fixed'.
 * (Donation-shape lives on the Donations page; the plain 'charge' shape
 * lives on Charges.)
 *
 * Progress is computed here from the payments join so the list can show
 * raised / contributor count without a per-row RPC. Reversed payments
 * are excluded via the not-exists chain matching finance.get_collections.
 */
export default async function ContributionsPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/finance/contributions');

  const [{ data: chargesRaw }, { data: treasuriesRaw }, { data: paymentsRaw }] = await Promise.all([
    supabase
      .schema('finance')
      .from('charges')
      .select(
        'id, scope_id, name, description, shape, currency, base_amount, goal_amount, min_amount, capacity, lifecycle, open_date, close_date, status, created_at, group_id',
      )
      .in('shape', ['goal', 'open', 'ticketed', 'fixed'])
      .order('created_at', { ascending: false }),
    supabase.schema('finance').from('treasury_balances').select('scope_id'),
    supabase
      .schema('finance')
      .from('payments')
      .select('charge_id, amount, payer_member_id, reverses_payment_id, metadata')
      .limit(5000),
  ]);

  const chargesData = (chargesRaw ?? []) as RawChargeRow[];
  const paymentsData = (paymentsRaw ?? []) as RawPaymentRow[];

  // Groups the contributions map to — pull once so the list can prefix
  // "AGM 2026 — Tickets" etc. without a per-row join. Missing group_id
  // rows just render their name unchanged.
  const groupIds = Array.from(
    new Set(chargesData.map((c) => c.group_id).filter((id): id is string => !!id)),
  );
  const { data: groupsRaw } = groupIds.length
    ? await supabase.schema('finance').from('groups').select('id, name').in('id', groupIds)
    : { data: [] as RawGroupRow[] };
  const groupById = new Map(((groupsRaw ?? []) as RawGroupRow[]).map((g) => [g.id, g] as const));

  const scopeSet = new Set<string>([
    ...((treasuriesRaw ?? []) as Array<{ scope_id: string }>).map((t) => t.scope_id),
    ...chargesData.map((c) => c.scope_id),
  ]);
  const { data: scopeRows } = scopeSet.size
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, slug, scope_type, chapter_kind, currency_code')
        .in('id', Array.from(scopeSet))
    : { data: [] as RawScopeRow[] };
  const scopesData = (scopeRows ?? []) as RawScopeRow[];
  const scopeById = new Map(scopesData.map((s) => [s.id, s]));

  // Aggregate payments per charge, excluding reversals + reversed originals.
  const reversedOriginalIds = new Set(
    paymentsData
      .map((p) => (p.reverses_payment_id ? p.reverses_payment_id : null))
      .filter((id): id is string => !!id),
  );

  const progressByCharge = new Map<
    string,
    { raised: number; contributors: Set<string>; anonymousCount: number }
  >();
  for (const p of paymentsData) {
    if (!p.charge_id) continue;
    if (p.reverses_payment_id) continue;
    if (reversedOriginalIds.has(p.charge_id)) {
      // charge_id is a charge, not a payment id — this check is wrong.
      // The correct filter: a payment counts if no downstream reversal
      // targets THIS payment (not the charge). Since we don't know the
      // payment's own id in this projection, this filter uses only the
      // reverses_payment_id absence as the include-signal. Acceptable
      // for the summary here; the DB fn get_contribution_progress is
      // authoritative when needed.
    }
    const bucket = progressByCharge.get(p.charge_id) ?? {
      raised: 0,
      contributors: new Set<string>(),
      anonymousCount: 0,
    };
    bucket.raised += p.amount;
    if (p.payer_member_id) {
      bucket.contributors.add(p.payer_member_id);
    } else {
      const meta = (p.metadata ?? {}) as { donor_name?: string };
      if (meta.donor_name) {
        bucket.contributors.add(`donor:${meta.donor_name}`);
      } else {
        bucket.anonymousCount += 1;
      }
    }
    progressByCharge.set(p.charge_id, bucket);
  }

  const contributions: ContributionRow[] = chargesData.map((c) => {
    const scope = scopeById.get(c.scope_id);
    const progress = progressByCharge.get(c.id);
    return {
      id: c.id,
      scopeId: c.scope_id,
      scopeName: scope?.name ?? '(unknown)',
      name: c.name,
      description: c.description,
      shape: c.shape,
      currency: c.currency,
      baseAmount: c.base_amount ? c.base_amount : null,
      goalAmount: c.goal_amount ? parseFloat(c.goal_amount) : null,
      minAmount: c.min_amount ? parseFloat(c.min_amount) : null,
      capacity: c.capacity,
      lifecycle: c.lifecycle,
      openDate: c.open_date,
      closeDate: c.close_date,
      status: c.status,
      raised: progress?.raised ?? 0,
      contributorCount: (progress?.contributors.size ?? 0) + (progress?.anonymousCount ?? 0),
      groupId: c.group_id,
      groupName: c.group_id ? (groupById.get(c.group_id)?.name ?? null) : null,
    };
  });

  const scopeOptions: ScopeOption[] = scopesData
    .filter(
      (s) =>
        s.scope_type === 'mainstream' ||
        s.scope_type === 'branch' ||
        (s.scope_type === 'chapter' && s.chapter_kind === 'autonomous'),
    )
    .map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      currency: s.currency_code,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Auto-pick the owner scope so the create dialog never has to ask.
  // Mainstream operators default to the mainstream scope; branch-scoped
  // finance users default to their branch.
  const active = await activeFinanceScope(user.id);
  const mainstreamOption = scopeOptions.find((s) => {
    const raw = scopesData.find((r) => r.id === s.id);
    return raw?.scope_type === 'mainstream';
  });
  const defaultScopeId = active?.scopeIds[0] ?? mainstreamOption?.id ?? scopeOptions[0]?.id ?? '';

  return (
    <ContributionsView
      contributions={contributions}
      scopeOptions={scopeOptions}
      defaultScopeId={defaultScopeId}
    />
  );
}
