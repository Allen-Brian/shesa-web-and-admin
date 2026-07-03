import { notFound } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';
import type { ScopeStatus } from '@/components/clusters/cluster-list';
import { resolveMemberBadges } from '@/lib/resolve-badges';

import { ChapterDetailView, type ChapterMemberRow } from './widgets/detail-view';

export const dynamic = 'force-dynamic';

interface ChapterDetailPageProps {
  readonly params: Promise<{ id: string; chapterId: string }>;
}

export default async function ChapterDetailPage({ params }: ChapterDetailPageProps) {
  const { id: branchId, chapterId } = await params;
  const supabase = await getServerClient();

  const [
    { data: chapterScope },
    { data: chapterDetail },
    { data: branchScope },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, slug, status, chapter_kind, currency_code, parent_scope_id')
      .eq('id', chapterId)
      .eq('scope_type', 'chapter')
      .maybeSingle(),
    supabase
      .schema('core')
      .from('chapters')
      .select(
        'scope_id, country_code, region, city, nickname, description, registration_fee_required, registration_fee_amount, registration_fee_currency, contact_email, contact_phone',
      )
      .eq('scope_id', chapterId)
      .maybeSingle(),
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, slug')
      .eq('id', branchId)
      .eq('scope_type', 'branch')
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!chapterScope || !chapterDetail || !branchScope) notFound();
  if (chapterScope.parent_scope_id !== branchId) notFound();

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

  let canUpdate = false;
  let canChangeAutonomy = false;
  if (user) {
    const [{ data: allowedUpdate }, { data: allowedAutonomy }] = await Promise.all([
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
    ]);
    canUpdate = allowedUpdate === true;
    canChangeAutonomy = allowedAutonomy === true;
  }

  return (
    <ChapterDetailView
      branchId={branchId}
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
      canUpdate={canUpdate}
      canChangeAutonomy={canChangeAutonomy}
    />
  );
}
