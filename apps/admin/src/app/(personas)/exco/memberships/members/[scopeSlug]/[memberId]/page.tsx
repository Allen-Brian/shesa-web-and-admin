import { notFound, redirect } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';
import { resolveMemberBadges } from '@/lib/resolve-badges';

import {
  MemberProfileView,
  type MemberProfile,
  type MembershipHistoryRow,
  type TransferDestination,
} from './widgets/member-detail-view';

export const dynamic = 'force-dynamic';

interface Params {
  readonly params: Promise<{ scopeSlug: string; memberId: string }>;
}

export default async function MemberProfilePage({ params }: Params) {
  const { scopeSlug, memberId } = await params;
  const supabase = await getServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/exco/memberships/members/${scopeSlug}/${memberId}`);

  const { data: scopeRow } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, slug, name, scope_type, chapter_kind')
    .eq('slug', scopeSlug)
    .maybeSingle();
  if (!scopeRow) notFound();

  const { data: member } = await supabase
    .schema('core')
    .from('members')
    .select(
      'id, full_name, email, phone, batch_scope_id, network_scope_id, house_scope_id, current_country, current_region_state, current_city, entry_year, exit_year, member_status, field',
    )
    .eq('id', memberId)
    .maybeSingle();

  // RLS-gated: full profile only for members within the viewer's scope.
  // If the caller can't see this member, RLS returns null → 404 (not 403;
  // 403 would leak existence).
  if (!member) notFound();

  const [{ data: refScopes }, { data: memberships }] = await Promise.all([
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, slug, scope_type, chapter_kind, entry_year')
      .in('id', [member.batch_scope_id, member.network_scope_id, member.house_scope_id]),
    supabase
      .schema('core')
      .from('memberships')
      .select(
        'id, scope_id, membership_status, join_method, engagement, joined_at, approved_at, left_at, transferred_at',
      )
      .eq('member_id', memberId)
      .order('joined_at', { ascending: false }),
  ]);

  const refMap = new Map((refScopes ?? []).map((s) => [s.id, s]));
  const mlist = memberships ?? [];
  const membershipScopeIds = Array.from(new Set(mlist.map((m) => m.scope_id)));
  const { data: membershipScopes } = membershipScopeIds.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, slug, scope_type, chapter_kind')
        .in('id', membershipScopeIds)
    : {
        data: [] as Array<{
          id: string;
          name: string;
          slug: string;
          scope_type: string;
          chapter_kind: string | null;
        }>,
      };
  const membershipScopeById = new Map((membershipScopes ?? []).map((s) => [s.id, s]));

  // Registration status per membership.
  const membershipIds = mlist.map((m) => m.id);
  const { data: regRows } = membershipIds.length
    ? await supabase
        .schema('core')
        .from('registration_status')
        .select(
          'membership_id, fee_required, amount, currency_code, marked_paid_at, waived_at, waived_reason, paid_on_behalf_at, paid_on_behalf_note',
        )
        .in('membership_id', membershipIds)
    : {
        data: [] as Array<{
          membership_id: string;
          fee_required: boolean;
          amount: number | null;
          currency_code: string | null;
          marked_paid_at: string | null;
          waived_at: string | null;
          waived_reason: string | null;
          paid_on_behalf_at: string | null;
          paid_on_behalf_note: string | null;
        }>,
      };
  const regByMembership = new Map((regRows ?? []).map((r) => [r.membership_id, r]));

  const badges = await resolveMemberBadges(supabase, [memberId]);

  const history: MembershipHistoryRow[] = mlist.map((m) => {
    const scope = membershipScopeById.get(m.scope_id);
    const reg = regByMembership.get(m.id);
    return {
      id: m.id,
      scope_id: m.scope_id,
      scope_name: scope?.name ?? '(unknown)',
      scope_slug: scope?.slug ?? '',
      scope_type: scope?.scope_type ?? 'unknown',
      status: m.membership_status,
      engagement: m.engagement as MembershipHistoryRow['engagement'],
      join_method: m.join_method,
      joined_at: m.joined_at,
      approved_at: m.approved_at,
      left_at: m.left_at,
      transferred_at: m.transferred_at,
      registration_state: reg
        ? !reg.fee_required
          ? 'not_required'
          : reg.marked_paid_at
            ? 'paid'
            : reg.waived_at
              ? 'waived'
              : reg.paid_on_behalf_at
                ? 'paid_on_behalf'
                : 'pending'
        : 'not_required',
      registration_note: reg?.waived_reason ?? reg?.paid_on_behalf_note ?? null,
      is_active: m.membership_status === 'active' || m.membership_status === 'passive',
    };
  });

  const profile: MemberProfile = {
    id: member.id,
    full_name: member.full_name,
    badge: badges.get(member.id) ?? null,
    email: member.email,
    phone: member.phone,
    batch_year: refMap.get(member.batch_scope_id)?.entry_year ?? null,
    batch_name: refMap.get(member.batch_scope_id)?.name ?? null,
    network_name: refMap.get(member.network_scope_id)?.name ?? null,
    house_name: refMap.get(member.house_scope_id)?.name ?? null,
    current_country: member.current_country,
    current_region_state: member.current_region_state,
    current_city: member.current_city,
    entry_year: member.entry_year,
    exit_year: member.exit_year,
    member_status: member.member_status,
    field: member.field,
  };

  // ─ Per-action permission gating (M6 spec) ─────────────────────────────
  // Each Admin Options button hides on its own key at the viewer's scope.
  // Rendering ≠ authorization — the Edge Functions re-check server-side
  // regardless. This is UI clutter reduction, not a security boundary.
  const [
    { data: canSetEngagement },
    { data: canMarkPaid },
    { data: canWaive },
    { data: canPayOnBehalf },
    { data: canTransfer },
    { data: canRemove },
  ] = await Promise.all([
    supabase.schema('core').rpc('has_permission', {
      p_user_id: user.id,
      p_scope_id: scopeRow.id,
      p_permission_key: 'membership.engagement.set',
    }),
    supabase.schema('core').rpc('has_permission', {
      p_user_id: user.id,
      p_scope_id: scopeRow.id,
      p_permission_key: 'registration.mark_paid',
    }),
    supabase.schema('core').rpc('has_permission', {
      p_user_id: user.id,
      p_scope_id: scopeRow.id,
      p_permission_key: 'registration.waive',
    }),
    supabase.schema('core').rpc('has_permission', {
      p_user_id: user.id,
      p_scope_id: scopeRow.id,
      p_permission_key: 'registration.pay_on_behalf',
    }),
    supabase.schema('core').rpc('has_permission', {
      p_user_id: user.id,
      p_scope_id: scopeRow.id,
      p_permission_key: 'membership.transfer',
    }),
    supabase.schema('core').rpc('has_permission', {
      p_user_id: user.id,
      p_scope_id: scopeRow.id,
      p_permission_key: 'membership.remove',
    }),
  ]);

  // The membership row at the viewer's scope — the target for every
  // per-membership action (engagement, registration, remove, transfer
  // source). If null, the member has no membership here; buttons that
  // need one stay hidden.
  const viewerMembership = history.find((h) => h.scope_id === scopeRow.id) ?? null;

  // Transfer destinations — branches + autonomous chapters other than
  // the current source. Scopes are public reference data (RLS is open
  // SELECT on core.scopes), so the picker can list everything.
  const { data: destinationRows } =
    canTransfer === true
      ? await supabase
          .schema('core')
          .from('scopes')
          .select('id, name, slug, scope_type, chapter_kind, status')
          .neq('id', scopeRow.id)
          .in('scope_type', ['branch', 'chapter'])
          .eq('status', 'active')
          .order('name')
      : {
          data: [] as Array<{
            id: string;
            name: string;
            slug: string;
            scope_type: string;
            chapter_kind: string | null;
            status: string;
          }>,
        };

  const transferDestinations: TransferDestination[] = (destinationRows ?? [])
    .filter((s) => s.scope_type === 'branch' || s.chapter_kind === 'autonomous')
    .map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      scope_type: s.scope_type as 'branch' | 'chapter',
    }));

  return (
    <MemberProfileView
      viewerScopeSlug={scopeRow.slug}
      viewerScopeName={scopeRow.name}
      viewerScopeId={scopeRow.id}
      viewerMembershipId={viewerMembership?.id ?? null}
      profile={profile}
      history={history}
      transferDestinations={transferDestinations}
      permissions={{
        setEngagement: canSetEngagement === true,
        markPaid: canMarkPaid === true,
        waive: canWaive === true,
        payOnBehalf: canPayOnBehalf === true,
        transfer: canTransfer === true,
        remove: canRemove === true,
      }}
    />
  );
}
