import { notFound, redirect } from 'next/navigation';
import { Cog, Landmark } from 'lucide-react';

import { getServerClient } from '@/lib/supabase-server';
import { GovernancePanel } from '@/components/governance/governance-panel';
import type {
  GovernancePositionCatalogRow,
  GovernancePositionHolderRow,
  GovernanceRoleHolderRow,
} from '@/components/governance/governance-panel';
import type { GovernanceMemberPickerRow } from '@/components/governance/assign-position-dialog';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Admin — Mainstream Settings' };

/**
 * Mainstream Settings — governance-only view for the Global Admin.
 *
 * Mainstream isn't a branch or chapter, so the ordinary
 * `/exco/settings/[scopeSlug]` route doesn't accept it. This dedicated
 * page shows the same GovernancePanel used elsewhere but scoped to
 * Mainstream: the federation-wide President, Vice President, Secretary
 * slate + the mainstream-level role grants.
 *
 * Only accessible to callers with `position.assign` at Mainstream
 * (equivalent to mainstream_admin). Anyone else 404s.
 */
export default async function MainstreamSettingsPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/exco/settings/mainstream');

  const { data: mainstream } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, name')
    .eq('scope_type', 'mainstream')
    .maybeSingle();
  if (!mainstream) notFound();
  const scopeId = mainstream.id;

  // Only mainstream_admin (position.assign at Mainstream) should reach
  // this page. Everyone else falls back to the ordinary settings picker.
  const { data: canManageGovernance } = await supabase.schema('core').rpc('has_permission', {
    p_user_id: user.id,
    p_scope_id: scopeId,
    p_permission_key: 'position.assign',
  });
  if (canManageGovernance !== true) notFound();

  // ── Governance data ─────────────────────────────────────────────────
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
      .eq('scope_type', 'mainstream')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .schema('core')
      .from('position_assignments')
      .select('id, member_id, position_catalog_id, custom_title, starts_at')
      .eq('scope_id', scopeId)
      .is('removed_at', null),
    supabase
      .schema('core')
      .from('role_assignments')
      .select('id, user_id, role_id, starts_at, scope_id')
      .is('scope_id', null)
      .is('revoked_at', null),
    supabase.schema('core').from('roles').select('id, key, name'),
  ]);

  const positionCatalog: GovernancePositionCatalogRow[] = (positionCatalogRaw ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    sort_order: p.sort_order,
    description: p.description,
  }));
  const catalogById = new Map(positionCatalog.map((c) => [c.id, c]));

  // Member picker for position assignment. Any member is eligible for a
  // mainstream position (unlike branches, which restrict to their own
  // roster). Pull the full member list; the picker's search handles the
  // rest.
  const memberIdsFromPositions = (positionAssignments ?? []).map((p) => p.member_id);
  const { data: allMemberRows } = await supabase
    .schema('core')
    .from('members')
    .select('id, full_name')
    .order('full_name')
    .limit(1000);
  const memberById = new Map(
    ((allMemberRows ?? []) as Array<{ id: string; full_name: string }>).map((m) => [m.id, m]),
  );

  // Fetch member_accounts up front for the position holders so the
  // governance table's Role column can resolve holder → auth_user_id →
  // role_assignment in one client-side pass.
  const { data: holderAccounts } = memberIdsFromPositions.length
    ? await supabase
        .schema('core')
        .from('member_accounts')
        .select('member_id, auth_user_id')
        .in('member_id', memberIdsFromPositions)
    : { data: [] as Array<{ member_id: string; auth_user_id: string | null }> };
  const authUserByMember = new Map(
    (holderAccounts ?? []).map((a) => [a.member_id, a.auth_user_id]),
  );

  const positionHolders: GovernancePositionHolderRow[] = (positionAssignments ?? []).map((a) => {
    const cat = catalogById.get(a.position_catalog_id);
    const mem = memberById.get(a.member_id);
    return {
      assignmentId: a.id,
      positionCatalogId: a.position_catalog_id,
      positionName: cat?.name ?? '(unknown)',
      memberId: a.member_id,
      memberName: mem?.full_name ?? '(unknown member)',
      authUserId: authUserByMember.get(a.member_id) ?? null,
      customTitle: a.custom_title,
      startsAt: a.starts_at,
    };
  });

  // Role holders at Mainstream = the NULL-scope role_assignments
  // (mainstream_admin, exco_secretary, etc.). Global grants only.
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

  // Reuse the position-holder account map for the picker (positions can
  // only be assigned to a member already holding — or eligible to hold —
  // one). authUserId is informational for hasAccount; post-2026-07-05
  // positions don't require an account.
  const memberPicker: GovernanceMemberPickerRow[] = (
    (allMemberRows ?? []) as Array<{
      id: string;
      full_name: string;
    }>
  ).map((m) => {
    const authUserId = authUserByMember.get(m.id) ?? null;
    return {
      memberId: m.id,
      fullName: m.full_name,
      hasAccount: !!authUserId,
      authUserId,
    };
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Landmark className="h-3.5 w-3.5" />
          Mainstream · Settings
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Cog className="h-6 w-6" />
          {mainstream.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Federation-wide governance — the executive slate and the portal roles that run alongside
          each position.
        </p>
      </div>

      <GovernancePanel
        scopeId={scopeId}
        scopeLabel={mainstream.name}
        scopeType="mainstream"
        positionCatalog={positionCatalog}
        positionHolders={positionHolders}
        roleHolders={roleHolders}
        memberPicker={memberPicker}
        canManage={canManageGovernance === true}
        canCreatePositions={canManageGovernance === true}
        emptyCatalogHint="No mainstream position catalog exists yet."
        emptyRolesHint="No global roles granted yet."
      />
    </div>
  );
}
