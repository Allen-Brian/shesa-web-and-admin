import { notFound } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';
import type { ScopeStatus } from '@/components/clusters/cluster-list';
import { resolveMemberBadges } from '@/lib/resolve-badges';
import type {
  GovernancePositionCatalogRow,
  GovernancePositionHolderRow,
  GovernanceRoleHolderRow,
} from '@/components/governance/governance-panel';
import type { GovernanceMemberPickerRow } from '@/components/governance/assign-position-dialog';

import { ChapterDetailView, type ChapterMemberRow } from './widgets/chapter-detail-view';

export const dynamic = 'force-dynamic';

interface ChapterDetailPageProps {
  readonly params: Promise<{ slug: string; chapterSlug: string }>;
}

export default async function ChapterDetailPage({ params }: ChapterDetailPageProps) {
  const { slug: branchSlug, chapterSlug } = await params;
  const supabase = await getServerClient();

  const [
    { data: chapterScope },
    { data: branchScope },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, slug, status, chapter_kind, currency_code, parent_scope_id')
      .eq('slug', chapterSlug)
      .eq('scope_type', 'chapter')
      .maybeSingle(),
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, slug')
      .eq('slug', branchSlug)
      .eq('scope_type', 'branch')
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!chapterScope || !branchScope) notFound();
  if (chapterScope.parent_scope_id !== branchScope.id) notFound();
  const branchId = branchScope.id;
  const chapterId = chapterScope.id;

  const { data: chapterDetail } = await supabase
    .schema('core')
    .from('chapters')
    .select(
      'scope_id, country_code, region, city, nickname, description, registration_fee_required, registration_fee_amount, registration_fee_currency, contact_email, contact_phone',
    )
    .eq('scope_id', chapterId)
    .maybeSingle();

  if (!chapterDetail) notFound();

  const isAutonomous = chapterScope.chapter_kind === 'autonomous';

  // Autonomous: their own memberships. Grouping: no memberships row —
  // members are tagged via the branch membership + a separate tag join
  // (deferred). For now grouping shows an empty roster with a note.
  const { data: memberships } = isAutonomous
    ? await supabase
        .schema('core')
        .from('memberships')
        .select('id, member_id, membership_status')
        .eq('scope_id', chapterId)
        .in('membership_status', ['active', 'passive', 'pending'])
    : { data: [] as Array<{ id: string; member_id: string; membership_status: string }> };

  const memberIds = Array.from(new Set((memberships ?? []).map((m) => m.member_id)));
  const { data: members } = memberIds.length
    ? await supabase
        .schema('core')
        .from('members')
        .select(
          'id, full_name, batch_scope_id, network_scope_id, house_scope_id, current_country, current_region_state, current_city',
        )
        .in('id', memberIds)
    : {
        data: [] as Array<{
          id: string;
          full_name: string;
          batch_scope_id: string;
          network_scope_id: string;
          house_scope_id: string;
          current_country: string | null;
          current_region_state: string | null;
          current_city: string | null;
        }>,
      };
  const memberMap = new Map((members ?? []).map((m) => [m.id, m]));

  const refIds = Array.from(
    new Set(
      (members ?? []).flatMap((m) => [m.batch_scope_id, m.network_scope_id, m.house_scope_id]),
    ),
  );
  const { data: refScopes } = refIds.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, scope_type, entry_year')
        .in('id', refIds)
    : {
        data: [] as Array<{
          id: string;
          name: string;
          scope_type: string;
          entry_year: number | null;
        }>,
      };
  const refMap = new Map((refScopes ?? []).map((s) => [s.id, s]));

  const badges = await resolveMemberBadges(
    supabase,
    (memberships ?? []).map((m) => m.member_id),
  );

  const rows: ChapterMemberRow[] = (memberships ?? []).map((m) => {
    const mem = memberMap.get(m.member_id);
    const batch = mem ? refMap.get(mem.batch_scope_id) : undefined;
    const network = mem ? refMap.get(mem.network_scope_id) : undefined;
    const house = mem ? refMap.get(mem.house_scope_id) : undefined;
    const location = [mem?.current_city, mem?.current_region_state, mem?.current_country]
      .filter(Boolean)
      .join(', ');
    return {
      id: m.id,
      member_id: m.member_id,
      full_name: mem?.full_name ?? '(missing member)',
      badge: badges.get(m.member_id) ?? null,
      batch_year: batch?.entry_year ?? null,
      house_name: house?.name ?? '—',
      network_name: network?.name ?? '—',
      membership_status: m.membership_status as 'active' | 'passive' | 'pending',
      location: location || null,
    };
  });

  // ── Governance data — only fetched for autonomous chapters. Grouping
  // chapters have no positions/roles of their own; they inherit from
  // their parent branch.
  let positionCatalog: GovernancePositionCatalogRow[] = [];
  let positionHolders: GovernancePositionHolderRow[] = [];
  let roleHolders: GovernanceRoleHolderRow[] = [];
  let memberPicker: GovernanceMemberPickerRow[] = [];

  if (isAutonomous) {
    const [
      { data: positionCatalogRaw },
      { data: positionAssignments },
      { data: roleAssignments },
      { data: allRoles },
    ] = await Promise.all([
      supabase
        .schema('core')
        .from('position_catalog')
        .select('id, name, sort_order, description')
        .eq('scope_type', 'chapter')
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .schema('core')
        .from('position_assignments')
        .select('id, member_id, position_catalog_id, custom_title, starts_at')
        .eq('scope_id', chapterId)
        .is('removed_at', null),
      supabase
        .schema('core')
        .from('role_assignments')
        .select('id, user_id, role_id, starts_at')
        .eq('scope_id', chapterId)
        .is('revoked_at', null),
      supabase.schema('core').from('roles').select('id, key, name'),
    ]);

    positionCatalog = (positionCatalogRaw ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      sort_order: p.sort_order,
      description: p.description,
    }));

    const positionMemberIds = Array.from(
      new Set((positionAssignments ?? []).map((p) => p.member_id)),
    );
    const { data: positionMembers } = positionMemberIds.length
      ? await supabase
          .schema('core')
          .from('members')
          .select('id, full_name')
          .in('id', positionMemberIds)
      : { data: [] as Array<{ id: string; full_name: string }> };
    const positionMemberMap = new Map((positionMembers ?? []).map((m) => [m.id, m]));
    const catalogById = new Map(positionCatalog.map((c) => [c.id, c]));

    // Fetch member_accounts for position holders up front so the
    // governance table's Role column can resolve holder → auth_user_id
    // → role_assignment client-side.
    const { data: holderAccounts } = positionMemberIds.length
      ? await supabase
          .schema('core')
          .from('member_accounts')
          .select('member_id, auth_user_id')
          .in('member_id', positionMemberIds)
      : { data: [] as Array<{ member_id: string; auth_user_id: string | null }> };
    const authUserByPositionMember = new Map(
      (holderAccounts ?? []).map((a) => [a.member_id, a.auth_user_id]),
    );

    positionHolders = (positionAssignments ?? []).map((a) => {
      const cat = catalogById.get(a.position_catalog_id);
      const mem = positionMemberMap.get(a.member_id);
      return {
        assignmentId: a.id,
        positionCatalogId: a.position_catalog_id,
        positionName: cat?.name ?? '(unknown)',
        memberId: a.member_id,
        memberName: mem?.full_name ?? '(unknown member)',
        authUserId: authUserByPositionMember.get(a.member_id) ?? null,
        customTitle: a.custom_title,
        startsAt: a.starts_at,
      };
    });

    // Role holders — resolve display via profiles.
    const roleUserIds = Array.from(new Set((roleAssignments ?? []).map((r) => r.user_id)));
    const { data: profiles } = roleUserIds.length
      ? await supabase
          .schema('core')
          .from('profiles')
          .select('id, display_name, email')
          .in('id', roleUserIds)
      : {
          data: [] as Array<{ id: string; display_name: string | null; email: string | null }>,
        };
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const rolesById = new Map((allRoles ?? []).map((r) => [r.id, r]));

    roleHolders = (roleAssignments ?? []).map((r) => {
      const role = rolesById.get(r.role_id);
      const prof = profileMap.get(r.user_id);
      return {
        assignmentId: r.id,
        userId: r.user_id,
        userLabel: prof?.display_name ?? prof?.email ?? r.user_id,
        roleKey: role?.key ?? '(unknown)',
        roleName: role?.name ?? '(unknown)',
        startsAt: r.starts_at,
      };
    });

    // Member picker for the assign-position dialog — draw from the
    // autonomous chapter's own membership list, with account linkage so
    // the "Also grant role" toggle can gate itself.
    const memberAccountsData = memberIds.length
      ? await supabase
          .schema('core')
          .from('member_accounts')
          .select('member_id, auth_user_id, claim_status')
          .in('member_id', memberIds)
      : {
          data: [] as Array<{
            member_id: string;
            auth_user_id: string | null;
            claim_status: string;
          }>,
        };
    const accountByMember = new Map((memberAccountsData.data ?? []).map((a) => [a.member_id, a]));

    memberPicker = (memberships ?? []).map((m) => {
      const mem = memberMap.get(m.member_id);
      const acct = accountByMember.get(m.member_id);
      return {
        memberId: m.member_id,
        fullName: mem?.full_name ?? '(missing)',
        hasAccount: !!acct?.auth_user_id,
        authUserId: acct?.auth_user_id ?? null,
      };
    });
  }

  let canUpdate = false;
  let canChangeAutonomy = false;
  let canManageGovernance = false;
  if (user) {
    const [{ data: allowedUpdate }, { data: allowedAutonomy }, { data: allowedGovern }] =
      await Promise.all([
        supabase.schema('core').rpc('has_permission', {
          p_user_id: user.id,
          p_scope_id: chapterId,
          p_permission_key: 'scope.update',
        }),
        supabase.schema('core').rpc('has_permission', {
          p_user_id: user.id,
          p_scope_id: chapterId,
          p_permission_key: 'scope.change_autonomy',
        }),
        supabase.schema('core').rpc('has_permission', {
          p_user_id: user.id,
          p_scope_id: chapterId,
          p_permission_key: 'position.assign',
        }),
      ]);
    canUpdate = allowedUpdate === true;
    canChangeAutonomy = allowedAutonomy === true;
    canManageGovernance = allowedGovern === true;
  }

  return (
    <ChapterDetailView
      branchId={branchId}
      branchSlug={branchScope.slug}
      branchName={branchScope.name}
      chapterId={chapterId}
      name={chapterScope.name}
      slug={chapterScope.slug}
      status={(chapterScope.status as ScopeStatus | undefined) ?? 'active'}
      chapterKind={isAutonomous ? 'autonomous' : 'grouping'}
      currencyCode={chapterScope.currency_code ?? ''}
      countryCode={chapterDetail.country_code}
      region={chapterDetail.region}
      city={chapterDetail.city}
      nickname={chapterDetail.nickname}
      description={chapterDetail.description}
      registrationFeeRequired={chapterDetail.registration_fee_required}
      registrationFeeAmount={chapterDetail.registration_fee_amount}
      registrationFeeCurrency={chapterDetail.registration_fee_currency}
      contactEmail={chapterDetail.contact_email}
      contactPhone={chapterDetail.contact_phone}
      memberCount={rows.length}
      members={rows}
      positionCatalog={positionCatalog}
      positionHolders={positionHolders}
      roleHolders={roleHolders}
      memberPicker={memberPicker}
      canUpdate={canUpdate}
      canChangeAutonomy={canChangeAutonomy}
      canManageGovernance={canManageGovernance}
    />
  );
}
