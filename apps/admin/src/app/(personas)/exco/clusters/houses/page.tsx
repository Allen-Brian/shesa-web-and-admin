import { ClusterPageHeader } from '@/components/clusters/page-header';
import { getServerClient } from '@/lib/supabase-server';

import { HousesListView, type HouseRow } from './widgets/houses-list-view';

export const dynamic = 'force-dynamic';

export default async function HousesPage() {
  const supabase = await getServerClient();

  const [{ data: houseRows }, { data: scopeRows }, { data: memberHouseRefs }] = await Promise.all([
    supabase
      .schema('core')
      .from('houses')
      .select('scope_id, color, color_hex, sort_order')
      .order('sort_order'),
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, slug, nickname')
      .eq('scope_type', 'house'),
    supabase.schema('core').from('members').select('house_scope_id'),
  ]);

  const scopeById = new Map((scopeRows ?? []).map((s) => [s.id, s]));

  const memberCountByHouse = new Map<string, number>();
  for (const m of memberHouseRefs ?? []) {
    if (!m.house_scope_id) continue;
    memberCountByHouse.set(m.house_scope_id, (memberCountByHouse.get(m.house_scope_id) ?? 0) + 1);
  }

  const rows: HouseRow[] = (houseRows ?? []).map((h, index) => {
    const scope = scopeById.get(h.scope_id);
    return {
      serial: index + 1,
      id: h.scope_id,
      name: scope?.name ?? '—',
      slug: scope?.slug ?? '',
      nickname: scope?.nickname ?? null,
      color: h.color,
      color_hex: h.color_hex,
      member_count: memberCountByHouse.get(h.scope_id) ?? 0,
    };
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <ClusterPageHeader
        title="Houses"
        subtitle="The four permanent houses every Shesa member belongs to. View-only."
      />

      <HousesListView data={rows} />
    </div>
  );
}
