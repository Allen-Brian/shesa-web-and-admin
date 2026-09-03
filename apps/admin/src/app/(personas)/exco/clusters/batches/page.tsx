import { ClusterPageHeader } from '@/components/clusters/page-header';
import { getServerClient } from '@/lib/supabase-server';
import type { ScopeStatus } from '@/components/clusters/cluster-list';

import { BatchesListView, type BatchRow } from './widgets/batches-list-view';

export const dynamic = 'force-dynamic';

export default async function BatchesPage() {
  const supabase = await getServerClient();

  const [
    { data: batchRows },
    { data: scopeRows },
    { data: memberRefs },
    { data: mainstream },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .schema('core')
      .from('batches')
      .select('scope_id, ordinal, nickname, description, contact_email, contact_phone'),
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, slug, status, entry_year')
      .eq('scope_type', 'batch'),
    supabase.schema('core').from('members').select('batch_scope_id'),
    supabase
      .schema('core')
      .from('scopes')
      .select('id')
      .eq('scope_type', 'mainstream')
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const scopeById = new Map((scopeRows ?? []).map((s) => [s.id, s]));

  const memberCountByBatch = new Map<string, number>();
  for (const m of memberRefs ?? []) {
    if (!m.batch_scope_id) continue;
    memberCountByBatch.set(m.batch_scope_id, (memberCountByBatch.get(m.batch_scope_id) ?? 0) + 1);
  }

  const rows: BatchRow[] = (batchRows ?? [])
    .map((b) => {
      const scope = scopeById.get(b.scope_id);
      if (!scope) return null;
      return {
        id: b.scope_id,
        name: scope.name,
        slug: scope.slug,
        status: (scope.status as ScopeStatus | undefined) ?? 'active',
        entry_year: scope.entry_year as number,
        ordinal: b.ordinal,
        nickname: b.nickname,
        description: b.description,
        contact_email: b.contact_email,
        contact_phone: b.contact_phone,
        member_count: memberCountByBatch.get(b.scope_id) ?? 0,
      } satisfies BatchRow;
    })
    .filter((r): r is BatchRow => r !== null)
    .sort((a, b) => b.entry_year - a.entry_year);

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
        title="Batches"
        subtitle="One batch per graduation year. Members carry their batch as an attribute — no separate membership row is created."
      />

      <BatchesListView data={rows} canCreate={canCreate} />
    </div>
  );
}
