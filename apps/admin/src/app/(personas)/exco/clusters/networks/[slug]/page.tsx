import { notFound } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';
import type { ScopeStatus } from '@/components/clusters/cluster-list';
import { resolveMemberBadges } from '@/lib/resolve-badges';

import { NetworkDetailHeader } from './widgets/network-header';
import { NetworkRoster, type RosterRow } from './widgets/network-roster';

export const dynamic = 'force-dynamic';

interface NetworkDetailPageProps {
  readonly params: Promise<{ slug: string }>;
}

export default async function NetworkDetailPage({ params }: NetworkDetailPageProps) {
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
      .select('id, name, slug, status')
      .eq('slug', slug)
      .eq('scope_type', 'network')
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!scopeRow) notFound();
  const id = scopeRow.id;

  const { data: networkRow } = await supabase
    .schema('core')
    .from('networks')
    .select('scope_id, short_name, description, icon, color_hex, sort_order')
    .eq('scope_id', id)
    .maybeSingle();

  if (!networkRow) notFound();

  // Members in this network — respects the caller's RLS reach per the
  // permission-scoped-roster rule locked 2026-07-02.
  const { data: members } = await supabase
    .schema('core')
    .from('members')
    .select(
      'id, full_name, batch_scope_id, field, current_country, current_region_state, current_city',
    )
    .eq('network_scope_id', id);

  const memberList = members ?? [];
  const memberIds = memberList.map((m) => m.id);
  const batchIds = Array.from(new Set(memberList.map((m) => m.batch_scope_id)));

  const [batchRes, membershipRes] = await Promise.all([
    batchIds.length
      ? supabase.schema('core').from('scopes').select('id, entry_year').in('id', batchIds)
      : Promise.resolve({ data: [] as { id: string; entry_year: number | null }[] }),
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

  const batchYearById = new Map((batchRes.data ?? []).map((b) => [b.id, b.entry_year]));

  const membershipScopeIds = Array.from(new Set((membershipRes.data ?? []).map((m) => m.scope_id)));
  const membershipScopeRes = membershipScopeIds.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, scope_type, chapter_kind')
        .in('id', membershipScopeIds)
    : {
        data: [] as {
          id: string;
          name: string;
          scope_type: string;
          chapter_kind: string | null;
        }[],
      };

  const membershipScopeById = new Map((membershipScopeRes.data ?? []).map((s) => [s.id, s]));

  const geographicByMember = new Map<string, { branchName: string; status: string }>();
  for (const m of membershipRes.data ?? []) {
    const scope = membershipScopeById.get(m.scope_id);
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

  const badges = await resolveMemberBadges(
    supabase,
    memberList.map((m) => m.id),
  );

  const rows: RosterRow[] = memberList.map((m) => {
    const affiliation = geographicByMember.get(m.id);
    const location = [m.current_city, m.current_region_state, m.current_country]
      .filter(Boolean)
      .join(', ');
    return {
      id: m.id,
      full_name: m.full_name,
      badge: badges.get(m.id) ?? null,
      batch_year: batchYearById.get(m.batch_scope_id) ?? null,
      location: location || null,
      membership_status: affiliation?.status ?? null,
      branch_name: affiliation?.branchName ?? null,
      field: m.field ?? null,
    };
  });

  let canUpdate = false;
  if (user) {
    const { data: allowed } = await supabase.schema('core').rpc('has_permission', {
      p_user_id: user.id,
      p_scope_id: id,
      p_permission_key: 'scope.update',
    });
    canUpdate = allowed === true;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <NetworkDetailHeader
        scopeId={id}
        name={scopeRow.name}
        slug={scopeRow.slug}
        shortName={networkRow.short_name}
        description={networkRow.description}
        colorHex={networkRow.color_hex}
        icon={networkRow.icon}
        sortOrder={networkRow.sort_order}
        status={(scopeRow.status as ScopeStatus | undefined) ?? 'active'}
        memberCount={rows.length}
        canUpdate={canUpdate}
      />

      <NetworkRoster data={rows} />
    </div>
  );
}
