import { notFound } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';
import type { ScopeStatus } from '@/components/clusters/cluster-list';
import { resolveMemberBadges } from '@/lib/resolve-badges';

import {
  BranchDetailView,
  type BranchChapterRow,
  type BranchMemberRow,
  type GovernanceMemberPickerRow,
  type PositionCatalogRow,
  type PositionHolderRow,
  type RoleHolderRow,
} from './widgets/branch-detail-view';

export const dynamic = 'force-dynamic';

interface BranchDetailPageProps {
  readonly params: Promise<{ slug: string }>;
}

export default async function BranchDetailPage({ params }: BranchDetailPageProps) {
  const { slug } = await params;
  const supabase = await getServerClient();

  const [
    { data: scopeRow },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, slug, status, currency_code')
      .eq('slug', slug)
      .eq('scope_type', 'branch')
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!scopeRow) notFound();
  const id = scopeRow.id;

  const { data: branchRow } = await supabase
    .schema('core')
    .from('branches')
    .select(
      'scope_id, country_code, region, city, nickname, description, registration_fee_required, registration_fee_amount, registration_fee_currency, contact_email, contact_phone',
    )
    .eq('scope_id', id)
    .maybeSingle();

  if (!branchRow) notFound();

  const [
    { data: chaptersRaw },
    { data: chapterDetail },
    { data: memberships },
    { data: positionCatalog },
    { data: positionAssignments },
    { data: roleAssignments },
    { data: allRoles },
  ] = await Promise.all([
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, slug, status, chapter_kind')
      .eq('scope_type', 'chapter')
      .eq('parent_scope_id', id),
    supabase.schema('core').from('chapters').select('scope_id, region, city, contact_email'),
    supabase
      .schema('core')
      .from('memberships')
      .select('id, member_id, scope_id, membership_status, joined_at')
      .eq('scope_id', id)
      .in('membership_status', ['active', 'passive', 'pending']),
    supabase
      .schema('core')
      .from('position_catalog')
      .select('id, name, sort_order, description')
      .eq('scope_type', 'branch')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .schema('core')
      .from('position_assignments')
      .select('id, member_id, position_catalog_id, custom_title, starts_at')
      .eq('scope_id', id)
      .is('removed_at', null),
    supabase
      .schema('core')
      .from('role_assignments')
      .select('id, user_id, role_id, starts_at')
      .eq('scope_id', id)
      .is('revoked_at', null),
    supabase.schema('core').from('roles').select('id, key, name'),
  ]);

  const chapterDetailById = new Map((chapterDetail ?? []).map((c) => [c.scope_id, c]));
  const chapterIds = (chaptersRaw ?? []).map((c) => c.id);
  const { data: chapterMemberRows } = chapterIds.length
    ? await supabase
        .schema('core')
        .from('memberships')
        .select('scope_id')
        .in('scope_id', chapterIds)
        .in('membership_status', ['active', 'passive'])
    : { data: [] as Array<{ scope_id: string }> };
  const memberCountByChapter = new Map<string, number>();
  for (const m of chapterMemberRows ?? []) {
    memberCountByChapter.set(m.scope_id, (memberCountByChapter.get(m.scope_id) ?? 0) + 1);
  }
  const chapters: BranchChapterRow[] = (chaptersRaw ?? []).map((c) => {
    const detail = chapterDetailById.get(c.id);
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: (c.status as ScopeStatus | undefined) ?? 'active',
      chapter_kind: (c.chapter_kind as 'autonomous' | 'grouping' | null) ?? 'grouping',
      region: detail?.region ?? '',
      city: detail?.city ?? '',
      contact_email: detail?.contact_email ?? null,
      member_count: memberCountByChapter.get(c.id) ?? 0,
    };
  });

  // Members roster
  const memberIds = Array.from(new Set((memberships ?? []).map((m) => m.member_id)));
  const { data: members } = memberIds.length
    ? await supabase
        .schema('core')
        .from('members')
        .select(
          'id, full_name, batch_scope_id, network_scope_id, house_scope_id, current_country, current_region_state, current_city',
        )
        .in('id', memberIds)
    : { data: [] };
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
    : { data: [] };
  const refMap = new Map((refScopes ?? []).map((s) => [s.id, s]));

  const badges = await resolveMemberBadges(supabase, memberIds);

  const memberRows: BranchMemberRow[] = (memberships ?? []).map((m) => {
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
      network_name: network?.name ?? '—',
      house_name: house?.name ?? '—',
      membership_status: m.membership_status as 'active' | 'passive' | 'pending',
      location: location || null,
    };
  });

  // ── Governance: position holders, role holders, role catalog ─────
  const positionCatalogRows: PositionCatalogRow[] = (positionCatalog ?? []).map((p) => ({
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
    : { data: [] };
  const positionMemberMap = new Map((positionMembers ?? []).map((m) => [m.id, m]));

  const catalogById = new Map(positionCatalogRows.map((c) => [c.id, c]));

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

  const positionHolders: PositionHolderRow[] = (positionAssignments ?? []).map((a) => {
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

  // Role holders — resolve auth user emails
  const roleUserIds = Array.from(new Set((roleAssignments ?? []).map((r) => r.user_id)));
  const { data: profiles } = roleUserIds.length
    ? await supabase
        .schema('core')
        .from('profiles')
        .select('id, display_name, email')
        .in('id', roleUserIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const rolesById = new Map((allRoles ?? []).map((r) => [r.id, r]));

  const roleHolders: RoleHolderRow[] = (roleAssignments ?? []).map((r) => {
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

  // Member picker for the assign-position dialog — pick from ALL branch
  // members. Look up member_accounts so the dialog can gate the
  // "Also grant a role" section.
  const memberAccountsData = memberIds.length
    ? await supabase
        .schema('core')
        .from('member_accounts')
        .select('member_id, auth_user_id, claim_status')
        .in('member_id', memberIds)
    : {
        data: [] as Array<{ member_id: string; auth_user_id: string | null; claim_status: string }>,
      };
  const accountByMember = new Map((memberAccountsData.data ?? []).map((a) => [a.member_id, a]));

  const memberPicker: GovernanceMemberPickerRow[] = (memberships ?? []).map((m) => {
    const mem = memberMap.get(m.member_id);
    const acct = accountByMember.get(m.member_id);
    return {
      memberId: m.member_id,
      fullName: mem?.full_name ?? '(missing)',
      hasAccount: !!acct?.auth_user_id,
      authUserId: acct?.auth_user_id ?? null,
    };
  });

  let canUpdate = false;
  let canManageGovernance = false;
  if (user) {
    const [{ data: allowedUpdate }, { data: allowedGovern }] = await Promise.all([
      supabase.schema('core').rpc('has_permission', {
        p_user_id: user.id,
        p_scope_id: id,
        p_permission_key: 'scope.update',
      }),
      supabase.schema('core').rpc('has_permission', {
        p_user_id: user.id,
        p_scope_id: id,
        p_permission_key: 'position.assign',
      }),
    ]);
    canUpdate = allowedUpdate === true;
    canManageGovernance = allowedGovern === true;
  }

  const autonomousChapterCount = chapters.filter((c) => c.chapter_kind === 'autonomous').length;

  return (
    <BranchDetailView
      scopeId={id}
      name={scopeRow.name}
      slug={scopeRow.slug}
      status={(scopeRow.status as ScopeStatus | undefined) ?? 'active'}
      currencyCode={scopeRow.currency_code ?? ''}
      countryCode={branchRow.country_code}
      region={branchRow.region}
      city={branchRow.city}
      nickname={branchRow.nickname}
      description={branchRow.description}
      registrationFeeRequired={branchRow.registration_fee_required}
      registrationFeeAmount={branchRow.registration_fee_amount}
      registrationFeeCurrency={branchRow.registration_fee_currency}
      contactEmail={branchRow.contact_email}
      contactPhone={branchRow.contact_phone}
      memberCount={memberRows.length}
      chapterCount={chapters.length}
      autonomousChapterCount={autonomousChapterCount}
      chapters={chapters}
      members={memberRows}
      positionCatalog={positionCatalogRows}
      positionHolders={positionHolders}
      roleHolders={roleHolders}
      memberPicker={memberPicker}
      canUpdate={canUpdate}
      canManageGovernance={canManageGovernance}
    />
  );
}
