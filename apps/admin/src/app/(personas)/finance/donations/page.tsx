import { redirect } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import { DonationsView } from './widgets/donations-view';
import type { CampaignRow, DonationRow, ScopeOption } from './widgets/donations-types';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Donations' };

interface RawChargeRow {
  readonly id: string;
  readonly scope_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly currency: string;
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

interface RawPaymentRow {
  readonly id: string;
  readonly charge_id: string | null;
  readonly scope_id: string;
  readonly payer_member_id: string | null;
  readonly amount: string;
  readonly currency: string;
  readonly method: string;
  readonly source: string;
  readonly reverses_payment_id: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly created_at: string;
}

interface RawScopeRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly scope_type: string;
  readonly chapter_kind: string | null;
  readonly currency_code: string;
}

interface RawMemberRow {
  readonly id: string;
  readonly full_name: string;
}

/**
 * Donations page — freewill gifts. Two tables:
 *   Campaigns  — donation-shape charges (create / approve / close /
 *                extend / archive).
 *   Donations  — payments against those campaigns, with the donor
 *                label resolved from payer_member_id or metadata
 *                (public entries carry donor_name in metadata).
 */
export default async function DonationsPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/finance/donations');

  const [{ data: chargesRaw }, { data: treasuriesRaw }, { data: paymentsRaw }] = await Promise.all([
    supabase
      .schema('finance' as never)
      .from('charges' as never)
      .select(
        'id, scope_id, name, description, currency, lifecycle, open_date, close_date, status, created_at, group_id',
      )
      .eq('shape', 'donation')
      .order('created_at', { ascending: false }),
    supabase
      .schema('finance' as never)
      .from('treasury_balances' as never)
      .select('scope_id'),
    supabase
      .schema('finance' as never)
      .from('payments' as never)
      .select(
        'id, charge_id, scope_id, payer_member_id, amount, currency, method, source, reverses_payment_id, metadata, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  const chargesData = (chargesRaw ?? []) as RawChargeRow[];
  const paymentsData = (paymentsRaw ?? []) as RawPaymentRow[];

  // Groups the donation campaigns hang off. One IN-list query — the
  // group name renders as a chip on both the campaign row and every
  // donation row so operators can spot event-scoped rows in the
  // mainstream list without pivoting into the group view.
  const groupIds = Array.from(
    new Set(chargesData.map((c) => c.group_id).filter((id): id is string => !!id)),
  );
  const { data: groupsRaw } = groupIds.length
    ? await supabase
        .schema('finance' as never)
        .from('groups' as never)
        .select('id, name')
        .in('id', groupIds)
    : { data: [] as RawGroupRow[] };
  const groupById = new Map(((groupsRaw ?? []) as RawGroupRow[]).map((g) => [g.id, g] as const));

  const scopeSet = new Set<string>([
    ...((treasuriesRaw ?? []) as Array<{ scope_id: string }>).map((t) => t.scope_id),
    ...chargesData.map((c) => c.scope_id),
    ...paymentsData.map((p) => p.scope_id),
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
  const chargeById = new Map(chargesData.map((c) => [c.id, c]));

  const memberIds = Array.from(
    new Set(paymentsData.map((p) => p.payer_member_id).filter((id): id is string => !!id)),
  );
  const { data: memberRows } = memberIds.length
    ? await supabase.schema('core').from('members').select('id, full_name').in('id', memberIds)
    : { data: [] as RawMemberRow[] };
  const memberById = new Map(((memberRows ?? []) as RawMemberRow[]).map((m) => [m.id, m]));

  const reversedIds = new Set(
    paymentsData.map((p) => p.reverses_payment_id).filter((id): id is string => !!id),
  );

  const donationChargeIds = new Set(chargesData.map((c) => c.id));

  // Aggregate raised / donor count per campaign (excludes reversals via
  // the same not-exists chain conceptually).
  const raisedByCharge = new Map<string, { raised: number; count: number }>();
  for (const p of paymentsData) {
    if (!p.charge_id) continue;
    if (!donationChargeIds.has(p.charge_id)) continue;
    if (p.reverses_payment_id) continue;
    if (reversedIds.has(p.id)) continue;
    const bucket = raisedByCharge.get(p.charge_id) ?? { raised: 0, count: 0 };
    bucket.raised += parseFloat(p.amount);
    bucket.count += 1;
    raisedByCharge.set(p.charge_id, bucket);
  }

  const campaigns: CampaignRow[] = chargesData.map((c) => {
    const scope = scopeById.get(c.scope_id);
    const agg = raisedByCharge.get(c.id) ?? { raised: 0, count: 0 };
    return {
      id: c.id,
      scopeId: c.scope_id,
      scopeName: scope?.name ?? '(unknown)',
      currency: c.currency,
      name: c.name,
      description: c.description,
      lifecycle: c.lifecycle,
      openDate: c.open_date,
      closeDate: c.close_date,
      status: c.status,
      raised: agg.raised,
      donationCount: agg.count,
      groupId: c.group_id,
      groupName: c.group_id ? (groupById.get(c.group_id)?.name ?? null) : null,
    };
  });

  const donations: DonationRow[] = paymentsData
    .filter((p) => p.charge_id && donationChargeIds.has(p.charge_id))
    .map((p) => {
      const scope = scopeById.get(p.scope_id);
      const charge = p.charge_id ? chargeById.get(p.charge_id) : null;
      const member = p.payer_member_id ? memberById.get(p.payer_member_id) : null;
      const meta = (p.metadata ?? {}) as {
        donor_name?: string;
        public_donation?: boolean;
      };
      const donorLabel =
        member?.full_name ??
        meta.donor_name ??
        (meta.public_donation ? 'Anonymous donor' : 'Walk-in');
      const groupId = charge?.group_id ?? null;
      return {
        id: p.id,
        campaignName: charge?.name ?? '—',
        scopeName: scope?.name ?? '—',
        donorLabel,
        isMember: !!member,
        isPublic: !!meta.public_donation,
        amount: parseFloat(p.amount),
        currency: p.currency,
        method: p.method,
        reversesPaymentId: p.reverses_payment_id,
        isReversed: reversedIds.has(p.id),
        createdAt: p.created_at,
        groupId,
        groupName: groupId ? (groupById.get(groupId)?.name ?? null) : null,
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
      currency: s.currency_code,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return <DonationsView campaigns={campaigns} donations={donations} scopeOptions={scopeOptions} />;
}
