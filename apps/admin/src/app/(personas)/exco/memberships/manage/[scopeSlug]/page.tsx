import { notFound } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import { ManageMembershipSwitcher } from './widgets/switcher';
import type { RequestRow, TransferRow } from './widgets/switcher';
import type { RegistrationRow } from './widgets/registration-table';

export const dynamic = 'force-dynamic';

interface Params {
  readonly params: Promise<{ scopeSlug: string }>;
}

export default async function ManageMembershipScopePage({ params }: Params) {
  const { scopeSlug } = await params;
  const supabase = await getServerClient();

  const { data: scopeRow } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, name, slug, scope_type, chapter_kind')
    .eq('slug', scopeSlug)
    .maybeSingle();

  if (!scopeRow) notFound();

  const isBranchLike =
    scopeRow.scope_type === 'branch' ||
    (scopeRow.scope_type === 'chapter' && scopeRow.chapter_kind === 'autonomous');
  if (!isBranchLike) notFound();

  // ── Pending join requests + pending incoming transfers + registration ──
  // Three parallel reads scoped to this branch. Everything below is
  // shape-only manipulation for the client widget.

  interface TransferBrief {
    id: string;
    member_id: string;
    source_scope_id: string;
    requested_by: string | null;
    requested_at: string;
    reason: string | null;
    created_at: string;
  }
  interface RegistrationBrief {
    membership_id: string;
    fee_required: boolean;
    amount: number | null;
    currency_code: string | null;
    marked_paid_at: string | null;
    waived_at: string | null;
    waived_reason: string | null;
    paid_on_behalf_at: string | null;
    paid_on_behalf_note: string | null;
  }

  const [{ data: pendingMemberships }, { data: pendingTransfersRaw }, { data: activeMemberships }] =
    await Promise.all([
      supabase
        .schema('core')
        .from('memberships')
        .select('id, member_id, join_method, joined_at, created_at')
        .eq('scope_id', scopeRow.id)
        .eq('membership_status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .schema('core')
        .from('membership_transfers')
        .select('id, member_id, source_scope_id, requested_by, requested_at, reason, created_at')
        .eq('destination_scope_id', scopeRow.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .schema('core')
        .from('memberships')
        .select('id, member_id, membership_status, joined_at')
        .eq('scope_id', scopeRow.id)
        .in('membership_status', ['active', 'passive']),
    ]);

  const pmList = pendingMemberships ?? [];
  const ptList = (pendingTransfersRaw as TransferBrief[] | null) ?? [];
  const amList = activeMemberships ?? [];

  const memberIds = Array.from(
    new Set([
      ...pmList.map((m) => m.member_id),
      ...ptList.map((t) => t.member_id),
      ...amList.map((m) => m.member_id),
    ]),
  );
  const sourceScopeIds = Array.from(new Set(ptList.map((t) => t.source_scope_id)));
  const membershipIds = amList.map((m) => m.id);

  const [{ data: memberRows }, { data: regRows }] = await Promise.all([
    memberIds.length
      ? supabase
          .schema('core')
          .from('members')
          .select('id, full_name, email, phone, batch_scope_id')
          .in('id', memberIds)
      : Promise.resolve({ data: [] as MemberBrief[] }),
    membershipIds.length
      ? supabase
          .schema('core')
          .from('registration_status')
          .select(
            'membership_id, fee_required, amount, currency_code, marked_paid_at, waived_at, waived_reason, paid_on_behalf_at, paid_on_behalf_note',
          )
          .in('membership_id', membershipIds)
      : Promise.resolve({ data: [] as RegistrationBrief[] }),
  ]);

  const memberById = new Map((memberRows ?? []).map((m) => [m.id, m]));
  const regByMembership = new Map((regRows ?? []).map((r) => [r.membership_id, r]));

  const batchIds = Array.from(new Set((memberRows ?? []).map((m) => m.batch_scope_id)));
  const refScopeIds = Array.from(new Set([...batchIds, ...sourceScopeIds]));
  const { data: refScopes } = refScopeIds.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, slug, scope_type, entry_year')
        .in('id', refScopeIds)
    : {
        data: [] as {
          id: string;
          name: string;
          slug: string;
          scope_type: string;
          entry_year: number | null;
        }[],
      };
  const refScopeById = new Map((refScopes ?? []).map((s) => [s.id, s]));

  const requests: RequestRow[] = pmList.map((m) => {
    const mem = memberById.get(m.member_id);
    const batch = mem ? refScopeById.get(mem.batch_scope_id) : undefined;
    return {
      membership_id: m.id,
      member_id: m.member_id,
      full_name: mem?.full_name ?? '(missing)',
      email: mem?.email ?? null,
      phone: mem?.phone ?? null,
      batch_name: batch?.name ?? null,
      join_method: m.join_method,
      requested_at: m.created_at,
    };
  });

  const transfers: TransferRow[] = ptList.map((t) => {
    const mem = memberById.get(t.member_id);
    const batch = mem ? refScopeById.get(mem.batch_scope_id) : undefined;
    const source = refScopeById.get(t.source_scope_id);
    return {
      transfer_id: t.id,
      member_id: t.member_id,
      full_name: mem?.full_name ?? '(missing)',
      email: mem?.email ?? null,
      phone: mem?.phone ?? null,
      batch_name: batch?.name ?? null,
      source_scope_name: source?.name ?? '(unknown)',
      source_scope_slug: source?.slug ?? '',
      reason: t.reason,
      requested_at: t.requested_at,
    };
  });

  const registration: RegistrationRow[] = amList.map((m) => {
    const mem = memberById.get(m.member_id);
    const reg = regByMembership.get(m.id);
    const batch = mem ? refScopeById.get(mem.batch_scope_id) : undefined;
    return {
      membership_id: m.id,
      member_id: m.member_id,
      full_name: mem?.full_name ?? '(missing)',
      email: mem?.email ?? null,
      phone: mem?.phone ?? null,
      batch_year: batch?.entry_year ?? null,
      batch_name: batch?.name ?? null,
      fee_required: reg?.fee_required ?? false,
      amount: reg?.amount ?? null,
      currency_code: reg?.currency_code ?? null,
      registration_state: reg ? computeRegistrationState(reg) : 'not_required',
      waived_reason: reg?.waived_reason ?? null,
      paid_on_behalf_note: reg?.paid_on_behalf_note ?? null,
      joined_at: m.joined_at,
      membership_status: m.membership_status as 'active' | 'passive',
    };
  });

  return (
    <ManageMembershipSwitcher
      scope={{
        id: scopeRow.id,
        slug: scopeRow.slug,
        name: scopeRow.name,
        scope_type: scopeRow.scope_type as 'branch' | 'chapter',
      }}
      requests={requests}
      transfers={transfers}
      registration={registration}
    />
  );
}

interface MemberBrief {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  batch_scope_id: string;
}

interface RegistrationBriefRow {
  fee_required: boolean;
  marked_paid_at: string | null;
  waived_at: string | null;
  paid_on_behalf_at: string | null;
}

function computeRegistrationState(
  reg: RegistrationBriefRow,
): RegistrationRow['registration_state'] {
  if (!reg.fee_required) return 'not_required';
  if (reg.marked_paid_at) return 'paid';
  if (reg.waived_at) return 'waived';
  if (reg.paid_on_behalf_at) return 'paid_on_behalf';
  return 'pending';
}
