import { notFound } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';
import { resolveMemberBadges } from '@/lib/resolve-badges';

import { HouseDetailHeader } from './widgets/house-header';
import { HouseRoster, type RosterRow } from './widgets/house-roster';

export const dynamic = 'force-dynamic';

interface HouseDetailPageProps {
  readonly params: Promise<{ slug: string }>;
}

export default async function HouseDetailPage({ params }: HouseDetailPageProps) {
  const { slug } = await params;
  const supabase = await getServerClient();

  const { data: scopeRow } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, name, nickname')
    .eq('slug', slug)
    .eq('scope_type', 'house')
    .maybeSingle();

  if (!scopeRow) notFound();
  const id = scopeRow.id;

  const { data: houseRow } = await supabase
    .schema('core')
    .from('houses')
    .select('scope_id, color, color_hex')
    .eq('scope_id', id)
    .maybeSingle();

  if (!houseRow) notFound();

  // Members in this house — respects the caller's RLS reach per the
  // permission-scoped-roster rule locked 2026-07-02.
  const { data: members } = await supabase
    .schema('core')
    .from('members')
    .select(
      'id, full_name, batch_scope_id, network_scope_id, current_country, current_region_state, current_city',
    )
    .eq('house_scope_id', id);

  const memberList = members ?? [];
  const memberIds = memberList.map((m) => m.id);
  const batchIds = Array.from(new Set(memberList.map((m) => m.batch_scope_id)));
  const networkIds = Array.from(new Set(memberList.map((m) => m.network_scope_id)));

  // Lookups for batch (entry_year) + network name.
  const [batchRes, networkRes, membershipRes] = await Promise.all([
    batchIds.length
      ? supabase.schema('core').from('scopes').select('id, entry_year, name').in('id', batchIds)
      : Promise.resolve({ data: [] as { id: string; entry_year: number | null; name: string }[] }),
    networkIds.length
      ? supabase.schema('core').from('scopes').select('id, name').in('id', networkIds)
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

  const batchScopes = new Map((batchRes.data ?? []).map((b) => [b.id, b]));
  const networkNames = new Map((networkRes.data ?? []).map((n) => [n.id, n.name]));

  // Resolve each membership scope's name + scope_type in one round-trip.
  const membershipScopeIds = Array.from(new Set((membershipRes.data ?? []).map((m) => m.scope_id)));
  const membershipScopeRes = membershipScopeIds.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, scope_type, chapter_kind')
        .in('id', membershipScopeIds)
    : {
        data: [] as { id: string; name: string; scope_type: string; chapter_kind: string | null }[],
      };

  const membershipScopeById = new Map((membershipScopeRes.data ?? []).map((s) => [s.id, s]));

  // Only branch + autonomous-chapter memberships surface as "geographic
  // affiliation" per Phase 1 §2.15. Grouping chapters are tags on the
  // parent branch, not affiliations of their own.
  const geographicByMember = new Map<string, { branchName: string; status: string }>();
  for (const m of membershipRes.data ?? []) {
    const scope = membershipScopeById.get(m.scope_id);
    if (!scope) continue;
    const isGeographic =
      scope.scope_type === 'branch' ||
      (scope.scope_type === 'chapter' && scope.chapter_kind === 'autonomous');
    if (!isGeographic) continue;
    // First one wins — a member usually only has one active geographic body.
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
    const batch = batchScopes.get(m.batch_scope_id);
    const affiliation = geographicByMember.get(m.id);
    const location = [m.current_city, m.current_region_state, m.current_country]
      .filter(Boolean)
      .join(', ');
    return {
      id: m.id,
      full_name: m.full_name,
      badge: badges.get(m.id) ?? null,
      batch_year: batch?.entry_year ?? null,
      location: location || null,
      membership_status: affiliation?.status ?? null,
      branch_name: affiliation?.branchName ?? null,
      network_name: networkNames.get(m.network_scope_id) ?? '—',
    };
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <HouseDetailHeader
        name={scopeRow.name}
        nickname={scopeRow.nickname}
        colorHex={houseRow.color_hex}
        colorName={houseRow.color}
        memberCount={rows.length}
      />

      <HouseRoster data={rows} />
    </div>
  );
}
