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

import { BatchDetailView, type BatchMemberRow } from './widgets/batch-detail-view';

export const dynamic = 'force-dynamic';

interface BatchDetailPageProps {
  readonly params: Promise<{ slug: string }>;
}

export default async function BatchDetailPage({ params }: BatchDetailPageProps) {
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
      .select('id, name, slug, status, entry_year')
      .eq('slug', slug)
      .eq('scope_type', 'batch')
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!scopeRow) notFound();
  const id = scopeRow.id;

  const { data: batchRow } = await supabase
    .schema('core')
    .from('batches')
    .select('scope_id, ordinal, nickname, description, contact_email, contact_phone')
    .eq('scope_id', id)
    .maybeSingle();

  if (!batchRow) notFound();

  // Batch members are anyone whose `members.batch_scope_id` = this batch.
  const { data: members } = await supabase
    .schema('core')
    .from('members')
    .select(
      'id, member_code, full_name, email, phone, house_scope_id, network_scope_id, current_country, current_region_state, current_city',
    )
    .eq('batch_scope_id', id);

  const memberList = members ?? [];
  const memberIds = memberList.map((m) => m.id);

  const refIds = Array.from(
    new Set(memberList.flatMap((m) => [m.house_scope_id, m.network_scope_id])),
  );
  const [{ data: refScopes }, { data: memberships }] = await Promise.all([
    refIds.length
      ? supabase.schema('core').from('scopes').select('id, name').in('id', refIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    memberIds.length
      ? supabase
          .schema('core')
          .from('memberships')
          .select('member_id, scope_id, membership_status')
          .in('member_id', memberIds)
          .in('membership_status', ['active', 'passive'])
      : Promise.resolve({
          data: [] as {
            member_id: string;
            scope_id: string;
            membership_status: string;
          }[],
        }),
  ]);
  const refMap = new Map((refScopes ?? []).map((s) => [s.id, s]));

  const branchIds = Array.from(new Set((memberships ?? []).map((m) => m.scope_id)));
  const { data: branchScopes } = branchIds.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, scope_type, chapter_kind')
        .in('id', branchIds)
    : {
        data: [] as Array<{
          id: string;
          name: string;
          scope_type: string;
          chapter_kind: string | null;
        }>,
      };
  const branchScopeById = new Map((branchScopes ?? []).map((s) => [s.id, s]));

  const geographicByMember = new Map<
    string,
    { readonly branchName: string; readonly status: string }
  >();
  for (const m of memberships ?? []) {
    const scope = branchScopeById.get(m.scope_id);
    if (!scope) continue;
    const isGeographic =
      scope.scope_type === 'branch' ||
      (scope.scope_type === 'chapter' && scope.chapter_kind === 'autonomous');
    if (!isGeographic) continue;
    if (!geographicByMember.has(m.member_id)) {
      geographicByMember.set(m.member_id, {
        branchName: scope.name,
        status: m.membership_status,
      });
    }
  }

  const badges = await resolveMemberBadges(supabase, memberIds);

  const memberRows: BatchMemberRow[] = memberList.map((m) => {
    const affiliation = geographicByMember.get(m.id);
    const location = [m.current_city, m.current_region_state, m.current_country]
      .filter(Boolean)
      .join(', ');
    return {
      id: m.id,
      member_id: m.id,
      member_code: m.member_code,
      full_name: m.full_name,
      email: m.email,
      phone: m.phone,
      badge: badges.get(m.id) ?? null,
      house_name: refMap.get(m.house_scope_id)?.name ?? '—',
      network_name: refMap.get(m.network_scope_id)?.name ?? '—',
      branch_name: affiliation?.branchName ?? null,
      membership_status: (affiliation?.status as BatchMemberRow['membership_status']) ?? null,
      location: location || null,
    };
  });

  // Ref options for the Create Member dialog — every active house and
  // every active network scope. Sorted by name for stable dropdown order.
  const [{ data: houseScopes }, { data: networkScopes }] = await Promise.all([
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, status')
      .eq('scope_type', 'house')
      .eq('status', 'active')
      .order('name'),
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, status')
      .eq('scope_type', 'network')
      .eq('status', 'active')
      .order('name'),
  ]);

  const houseOptions = (houseScopes ?? []).map((h) => ({ id: h.id, name: h.name }));
  const networkOptions = (networkScopes ?? []).map((n) => ({ id: n.id, name: n.name }));

  // ── Governance — batch positions live in position_catalog with
  // scope_type='batch'. Role holders are role_assignments at this batch.
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
      .eq('scope_type', 'batch')
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

  const positionCatalog: GovernancePositionCatalogRow[] = (positionCatalogRaw ?? []).map((p) => ({
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

  const positionHolders: GovernancePositionHolderRow[] = (positionAssignments ?? []).map((a) => {
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

  const roleHolders: GovernanceRoleHolderRow[] = (roleAssignments ?? []).map((r) => {
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

  const memberPicker: GovernanceMemberPickerRow[] = memberList.map((m) => {
    const acct = accountByMember.get(m.id);
    return {
      memberId: m.id,
      fullName: m.full_name,
      hasAccount: !!acct?.auth_user_id,
      authUserId: acct?.auth_user_id ?? null,
    };
  });

  let canUpdate = false;
  let canManageGovernance = false;
  let canManageMembers = false;
  if (user) {
    const [{ data: allowedUpdate }, { data: allowedGovern }, { data: allowedMembers }] =
      await Promise.all([
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
        supabase.schema('core').rpc('has_permission', {
          p_user_id: user.id,
          p_scope_id: id,
          p_permission_key: 'member.create',
        }),
      ]);
    canUpdate = allowedUpdate === true;
    canManageGovernance = allowedGovern === true;
    canManageMembers = allowedMembers === true;
  }

  return (
    <BatchDetailView
      scopeId={id}
      name={scopeRow.name}
      slug={scopeRow.slug}
      status={(scopeRow.status as ScopeStatus | undefined) ?? 'active'}
      entryYear={scopeRow.entry_year as number}
      ordinal={batchRow.ordinal}
      nickname={batchRow.nickname}
      description={batchRow.description}
      contactEmail={batchRow.contact_email}
      contactPhone={batchRow.contact_phone}
      memberCount={memberRows.length}
      members={memberRows}
      houseOptions={houseOptions}
      networkOptions={networkOptions}
      positionCatalog={positionCatalog}
      positionHolders={positionHolders}
      roleHolders={roleHolders}
      memberPicker={memberPicker}
      canUpdate={canUpdate}
      canManageGovernance={canManageGovernance}
      canManageMembers={canManageMembers}
    />
  );
}
