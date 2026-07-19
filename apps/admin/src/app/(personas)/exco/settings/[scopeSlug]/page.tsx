import { notFound, redirect } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';
import type {
  GovernancePositionCatalogRow,
  GovernancePositionHolderRow,
  GovernanceRoleHolderRow,
} from '@/components/governance/governance-panel';
import type { GovernanceMemberPickerRow } from '@/components/governance/assign-position-dialog';

import { SettingsView, type SettingsScope } from './widgets/settings-view';

export const dynamic = 'force-dynamic';

interface Params {
  readonly params: Promise<{ scopeSlug: string }>;
}

export default async function SettingsScopePage({ params }: Params) {
  const { scopeSlug } = await params;
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/exco/settings/${scopeSlug}`);

  // Resolve the scope. Only branches + autonomous chapters qualify;
  // batches / houses / networks live under Clusters and don't have a
  // Settings surface here.
  const { data: scopeRow } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, name, slug, scope_type, chapter_kind, status, currency_code')
    .eq('slug', scopeSlug)
    .maybeSingle();

  if (!scopeRow) notFound();
  const isBranchLike =
    scopeRow.scope_type === 'branch' ||
    (scopeRow.scope_type === 'chapter' && scopeRow.chapter_kind === 'autonomous');
  if (!isBranchLike) notFound();
  const id = scopeRow.id;

  // Permission preflight — a branch admin holds scope.update at their
  // branch; a global mainstream_admin passes at any child scope via
  // has_permission's tree walk.
  const [{ data: canUpdate }, { data: canManageGovernance }] = await Promise.all([
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
  if (canUpdate !== true && canManageGovernance !== true) notFound();

  // Global admin lens: if the viewer holds a NULL-scope mainstream_admin
  // grant, Settings shows Governance only. Editing branch/chapter
  // metadata belongs to the branch admin under Settings (or the global
  // admin via Clusters); the Settings surface at this scope narrows to
  // governance so global admins don't accidentally use the branch admin's
  // edit flow.
  const { data: globalGrantRows } = await supabase
    .schema('core')
    .from('role_assignments')
    .select('id, role_id, revoked_at, starts_at, ends_at, roles!inner(key)')
    .eq('user_id', user.id)
    .is('scope_id', null)
    .is('revoked_at', null);
  const now = Date.now();
  const isGlobalAdmin = (
    (globalGrantRows ?? []) as Array<{
      revoked_at: string | null;
      starts_at: string;
      ends_at: string | null;
      roles: { key: string };
    }>
  ).some((r) => {
    if (r.roles.key !== 'mainstream_admin') return false;
    if (r.revoked_at) return false;
    if (new Date(r.starts_at).getTime() > now) return false;
    if (r.ends_at && new Date(r.ends_at).getTime() <= now) return false;
    return true;
  });

  // Chapters need their parent branch's id + name for the ChapterForm
  // shape. Fetched inline; branches don't need it.
  let parentBranch: { id: string; name: string } | null = null;
  if (scopeRow.scope_type === 'chapter') {
    const { data: chapterScopeRow } = await supabase
      .schema('core')
      .from('scopes')
      .select('parent_scope_id')
      .eq('id', id)
      .maybeSingle();
    if (chapterScopeRow?.parent_scope_id) {
      const { data: parentScope } = await supabase
        .schema('core')
        .from('scopes')
        .select('id, name')
        .eq('id', chapterScopeRow.parent_scope_id)
        .maybeSingle();
      if (parentScope) parentBranch = { id: parentScope.id, name: parentScope.name };
    }
  }

  // Editable body fields — branch OR chapter. We pull both; only one
  // will populate depending on scope_type.
  const [{ data: branchRow }, { data: chapterRow }] = await Promise.all([
    scopeRow.scope_type === 'branch'
      ? supabase
          .schema('core')
          .from('branches')
          .select(
            'scope_id, country_code, region, city, nickname, description, registration_fee_required, registration_fee_amount, registration_fee_currency, contact_email, contact_phone',
          )
          .eq('scope_id', id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    scopeRow.scope_type === 'chapter'
      ? supabase
          .schema('core')
          .from('chapters')
          .select('scope_id, region, city, nickname, description, contact_email')
          .eq('scope_id', id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // ── Governance data ─────────────────────────────────────────────────
  const [
    { data: positionCatalogRaw },
    { data: positionAssignments },
    { data: roleAssignments },
    { data: allRoles },
    { data: memberships },
  ] = await Promise.all([
    supabase
      .schema('core')
      .from('position_catalog')
      .select('id, name, sort_order, description')
      .eq('scope_type', scopeRow.scope_type)
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
    supabase
      .schema('core')
      .from('memberships')
      .select('member_id, membership_status')
      .eq('scope_id', id)
      .in('membership_status', ['active', 'passive']),
  ]);

  const positionCatalog: GovernancePositionCatalogRow[] = (positionCatalogRaw ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    sort_order: p.sort_order,
    description: p.description,
  }));
  const catalogById = new Map(positionCatalog.map((c) => [c.id, c]));

  const memberIds = Array.from(
    new Set([
      ...(positionAssignments ?? []).map((p) => p.member_id),
      ...(memberships ?? []).map((m) => m.member_id),
    ]),
  );
  const { data: memberRows } = memberIds.length
    ? await supabase.schema('core').from('members').select('id, full_name').in('id', memberIds)
    : { data: [] as Array<{ id: string; full_name: string }> };
  const memberById = new Map((memberRows ?? []).map((m) => [m.id, m]));

  // Member picker — links members to auth users when available. Fetch
  // once so both `positionHolders.authUserId` (for the Role column in
  // the governance table) and the picker's `hasAccount` share the map.
  const { data: accounts } = memberIds.length
    ? await supabase
        .schema('core')
        .from('member_accounts')
        .select('member_id, auth_user_id, claim_status')
        .in('member_id', memberIds)
    : {
        data: [] as Array<{ member_id: string; auth_user_id: string | null; claim_status: string }>,
      };
  const accountByMember = new Map((accounts ?? []).map((a) => [a.member_id, a]));

  const positionHolders: GovernancePositionHolderRow[] = (positionAssignments ?? []).map((a) => {
    const cat = catalogById.get(a.position_catalog_id);
    const mem = memberById.get(a.member_id);
    const acct = accountByMember.get(a.member_id);
    return {
      assignmentId: a.id,
      positionCatalogId: a.position_catalog_id,
      positionName: cat?.name ?? '(unknown)',
      memberId: a.member_id,
      memberName: mem?.full_name ?? '(unknown member)',
      authUserId: acct?.auth_user_id ?? null,
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
    : { data: [] as Array<{ id: string; display_name: string | null; email: string | null }> };
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

  // Picker is drawn from the scope's active/passive memberships (only
  // members of this branch qualify to hold its positions). `hasAccount`
  // is informational post-2026-07-05.
  const memberPicker: GovernanceMemberPickerRow[] = (memberships ?? [])
    .map((m) => {
      const mem = memberById.get(m.member_id);
      const acct = accountByMember.get(m.member_id);
      return {
        memberId: m.member_id,
        fullName: mem?.full_name ?? '(unknown)',
        hasAccount: !!acct?.auth_user_id,
        authUserId: acct?.auth_user_id ?? null,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const scope: SettingsScope = {
    id,
    slug: scopeRow.slug,
    name: scopeRow.name,
    scope_type: scopeRow.scope_type as 'branch' | 'chapter',
    chapter_kind: (scopeRow.chapter_kind as 'autonomous' | 'grouping' | null) ?? null,
    currency_code: (scopeRow.currency_code as string | null) ?? null,
  };

  return (
    <SettingsView
      scope={scope}
      branchInitial={
        branchRow
          ? {
              scopeId: id,
              name: scopeRow.name,
              slug: scopeRow.slug,
              nickname: branchRow.nickname,
              description: branchRow.description,
              countryCode: branchRow.country_code,
              region: branchRow.region,
              city: branchRow.city,
              currencyCode: scopeRow.currency_code as string,
              registrationFeeRequired: branchRow.registration_fee_required,
              registrationFeeAmount: branchRow.registration_fee_amount,
              registrationFeeCurrency: branchRow.registration_fee_currency,
              contactEmail: branchRow.contact_email,
              contactPhone: branchRow.contact_phone,
            }
          : null
      }
      chapterInitial={
        chapterRow && parentBranch
          ? {
              scopeId: id,
              parentBranchId: parentBranch.id,
              parentBranchName: parentBranch.name,
              chapterKind: 'autonomous',
              name: scopeRow.name,
              slug: scopeRow.slug,
              region: chapterRow.region ?? undefined,
              city: chapterRow.city ?? undefined,
              nickname: chapterRow.nickname,
              description: chapterRow.description,
              contactEmail: chapterRow.contact_email,
            }
          : null
      }
      positionCatalog={positionCatalog}
      positionHolders={positionHolders}
      roleHolders={roleHolders}
      memberPicker={memberPicker}
      canUpdate={canUpdate === true}
      canManageGovernance={canManageGovernance === true}
      canCreatePositions={isGlobalAdmin}
      hideEditTab={isGlobalAdmin}
    />
  );
}
