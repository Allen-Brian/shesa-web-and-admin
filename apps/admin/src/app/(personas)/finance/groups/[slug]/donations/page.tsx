import { notFound } from 'next/navigation';

import { loadGroupBySlug } from '@/lib/finance/groups/load-group';
import { loadMemberContacts } from '@/lib/finance/member-contacts';
import { getServerClient } from '@/lib/supabase-server';

import { DonationsView } from '../../../donations/widgets/donations-view';
import type {
  CampaignRow,
  DonationRow,
  ScopeOption,
} from '../../../donations/widgets/donations-types';

export const dynamic = 'force-dynamic';

interface Props {
  readonly params: Promise<{ slug: string }>;
}

interface RawCampaign {
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
}

interface RawPayment {
  readonly id: string;
  readonly charge_id: string | null;
  readonly scope_id: string;
  readonly payer_member_id: string | null;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  readonly reverses_payment_id: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly created_at: string;
}

/**
 * Group donations — every donation-shape charge with `group_id = this`
 * (campaigns) plus every payment against those charges. Reuses
 * DonationsView; the default same-named campaign auto-created with
 * the group appears at the top of the list.
 */
export default async function GroupDonationsPage({ params }: Props) {
  const { slug } = await params;
  const group = await loadGroupBySlug(slug);
  if (!group) notFound();

  const supabase = await getServerClient();
  const { data: campaignsRaw } = await supabase
    .schema('finance')
    .from('charges')
    .select(
      'id, scope_id, name, description, currency, lifecycle, open_date, close_date, status, created_at',
    )
    .eq('shape', 'donation')
    .eq('group_id', group.id)
    .order('created_at', { ascending: false });
  const campaignsData = (campaignsRaw ?? []) as RawCampaign[];
  const campaignIds = campaignsData.map((c) => c.id);

  const { data: paymentsRaw } = campaignIds.length
    ? await supabase
        .schema('finance')
        .from('payments')
        .select(
          'id, charge_id, scope_id, payer_member_id, amount, currency, method, reverses_payment_id, metadata, created_at',
        )
        .in('charge_id', campaignIds)
        .order('created_at', { ascending: false })
        .limit(500)
    : { data: [] as RawPayment[] };
  const paymentsData = (paymentsRaw ?? []) as RawPayment[];

  const scopeIds = Array.from(new Set(campaignsData.map((c) => c.scope_id)));
  const memberIds = Array.from(
    new Set(paymentsData.map((p) => p.payer_member_id).filter((id): id is string => !!id)),
  );
  const [{ data: scopeRows }, memberById] = await Promise.all([
    scopeIds.length
      ? supabase.schema('core').from('scopes').select('id, name, currency_code').in('id', scopeIds)
      : Promise.resolve({ data: [] }),
    loadMemberContacts(supabase, memberIds),
  ]);
  const scopeById = new Map(
    ((scopeRows ?? []) as Array<{ id: string; name: string; currency_code: string }>).map((s) => [
      s.id,
      s,
    ]),
  );
  const campaignChargeIds = new Set(campaignsData.map((c) => c.id));
  const chargeById = new Map(campaignsData.map((c) => [c.id, c]));

  const reversedIds = new Set(
    paymentsData.map((p) => p.reverses_payment_id).filter((id): id is string => !!id),
  );
  const raisedByCharge = new Map<string, { raised: number; count: number }>();
  for (const p of paymentsData) {
    if (!p.charge_id) continue;
    if (!campaignChargeIds.has(p.charge_id)) continue;
    if (p.reverses_payment_id) continue;
    if (reversedIds.has(p.id)) continue;
    const bucket = raisedByCharge.get(p.charge_id) ?? { raised: 0, count: 0 };
    bucket.raised += p.amount;
    bucket.count += 1;
    raisedByCharge.set(p.charge_id, bucket);
  }

  const campaigns: CampaignRow[] = campaignsData.map((c) => {
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
      groupId: group.id,
      groupName: group.name,
    };
  });

  const donations: DonationRow[] = paymentsData
    .filter((p) => p.charge_id && campaignChargeIds.has(p.charge_id))
    .map((p) => {
      const scope = scopeById.get(p.scope_id);
      const charge = p.charge_id ? chargeById.get(p.charge_id) : null;
      const member = p.payer_member_id ? memberById.get(p.payer_member_id) : null;
      const meta = (p.metadata ?? {}) as {
        donor_name?: string;
        payer_name?: string;
        donor_email?: string;
        payer_email?: string;
        payer_phone?: string;
        public_donation?: boolean;
      };
      // `donor_name` is what the donation form writes; a ticket or
      // attire purchase writes `payer_name`. Checking only the first
      // made every public buyer render as "Walk-in" — they had given
      // us their name, we just looked in the wrong key.
      const donorLabel =
        member?.fullName ??
        meta.donor_name ??
        meta.payer_name ??
        (meta.public_donation ? 'Anonymous donor' : 'Walk-in');
      return {
        id: p.id,
        campaignName: charge?.name ?? '—',
        scopeName: scope?.name ?? '—',
        donorLabel,
        donorEmail: meta.donor_email ?? meta.payer_email ?? member?.email ?? null,
        donorPhone: meta.payer_phone ?? member?.phone ?? null,
        donorBatch: member?.batchName ?? null,
        donorMemberCode: member?.memberCode ?? null,
        isMember: !!member,
        isPublic: !!meta.public_donation,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        reversesPaymentId: p.reverses_payment_id,
        isReversed: reversedIds.has(p.id),
        createdAt: p.created_at,
        groupId: group.id,
        groupName: group.name,
      };
    });

  const scopeOptions: ScopeOption[] = Array.from(scopeById.values()).map((s) => ({
    id: s.id,
    name: s.name,
    currency: s.currency_code,
  }));

  return <DonationsView campaigns={campaigns} donations={donations} scopeOptions={scopeOptions} />;
}
