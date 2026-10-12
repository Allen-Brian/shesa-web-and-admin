import { ClusterPageHeader } from '@/components/clusters/page-header';
import { getServerClient } from '@/lib/supabase-server';
import type { ScopeStatus } from '@/components/clusters/cluster-list';

import { NetworksListView, type NetworkRow } from './widgets/networks-list-view';

export const dynamic = 'force-dynamic';

export default async function NetworksPage() {
  const supabase = await getServerClient();

  const [
    { data: networkRows },
    { data: scopeRows },
    { data: memberRefs },
    { data: mainstream },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .schema('core')
      .from('networks')
      .select('scope_id, short_name, description, icon, color_hex, sort_order')
      .order('sort_order'),
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, slug, status')
      .eq('scope_type', 'network'),
    supabase.schema('core').from('members').select('network_scope_id'),
    supabase
      .schema('core')
      .from('scopes')
      .select('id')
      .eq('scope_type', 'mainstream')
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const scopeById = new Map((scopeRows ?? []).map((s) => [s.id, s]));

  const memberCountByNetwork = new Map<string, number>();
  for (const m of memberRefs ?? []) {
    if (!m.network_scope_id) continue;
    memberCountByNetwork.set(
      m.network_scope_id,
      (memberCountByNetwork.get(m.network_scope_id) ?? 0) + 1,
    );
  }

  const rows: NetworkRow[] = (networkRows ?? []).map((n) => {
    const scope = scopeById.get(n.scope_id);
    return {
      id: n.scope_id,
      name: scope?.name ?? '—',
      slug: scope?.slug ?? '',
      status: (scope?.status as ScopeStatus | undefined) ?? 'active',
      short_name: n.short_name,
      description: n.description,
      icon: n.icon,
      color_hex: n.color_hex,
      sort_order: n.sort_order,
      member_count: memberCountByNetwork.get(n.scope_id) ?? 0,
    };
  });

  let canCreate = false;
  if (user && mainstream) {
    const { data: allowed } = await supabase.schema('core').rpc('has_permission', {
      p_user_id: user.id,
      p_scope_id: mainstream.id,
      p_permission_key: 'scope.create',
    });
    canCreate = allowed === true;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <ClusterPageHeader
        title="Professional Networks"
        subtitle="Cross-cutting groupings of members by profession. Each network powers one Connect forum."
      />

      <NetworksListView data={rows} canCreate={canCreate} />
    </div>
  );
}
