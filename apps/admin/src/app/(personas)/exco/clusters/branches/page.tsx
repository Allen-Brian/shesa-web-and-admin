import { StatsCard } from '@shesa/ui';

import { ClusterPageHeader } from '@/components/clusters/page-header';
import { getServerClient } from '@/lib/supabase-server';
import type { ScopeStatus } from '@/components/clusters/cluster-list';
import { isDiaspora } from '@/lib/country-currency';

import { BranchesListView, type BranchRow, type ChapterRow } from './widgets/branches-list-view';

export const dynamic = 'force-dynamic';

export default async function BranchesPage() {
  const supabase = await getServerClient();

  const [
    { data: branchRows },
    { data: scopeRows },
    { data: chapterScopeRows },
    { data: chapterDetailRows },
    { data: memberships },
    { data: mainstream },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .schema('core')
      .from('branches')
      .select('scope_id, country_code, region, city, nickname'),
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, slug, status, currency_code')
      .eq('scope_type', 'branch'),
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, slug, status, parent_scope_id, chapter_kind')
      .eq('scope_type', 'chapter'),
    supabase.schema('core').from('chapters').select('scope_id, country_code, region, city'),
    supabase
      .schema('core')
      .from('memberships')
      .select('scope_id, member_id, membership_status')
      .in('membership_status', ['active', 'passive']),
    supabase
      .schema('core')
      .from('scopes')
      .select('id')
      .eq('scope_type', 'mainstream')
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const scopeById = new Map((scopeRows ?? []).map((s) => [s.id, s]));

  // Chapter counts per branch (all chapters), plus autonomous flag map
  // for the member-count exclusion below.
  const chaptersByBranch = new Map<string, string[]>();
  const autonomousChapterIds = new Set<string>();
  for (const c of chapterScopeRows ?? []) {
    if (!c.parent_scope_id) continue;
    const bucket = chaptersByBranch.get(c.parent_scope_id) ?? [];
    bucket.push(c.id);
    chaptersByBranch.set(c.parent_scope_id, bucket);
    if (c.chapter_kind === 'autonomous') autonomousChapterIds.add(c.id);
  }

  // Full chapter rows for the expandable child rendering under each branch.
  const chapterDetailByScopeId = new Map((chapterDetailRows ?? []).map((c) => [c.scope_id, c]));
  const memberCountByChapter = new Map<string, number>();
  for (const m of memberships ?? []) {
    if (!m.scope_id) continue;
    if (!chapterDetailByScopeId.has(m.scope_id)) continue;
    memberCountByChapter.set(m.scope_id, (memberCountByChapter.get(m.scope_id) ?? 0) + 1);
  }
  const chapters: ChapterRow[] = (chapterScopeRows ?? [])
    .filter((c) => c.parent_scope_id)
    .map((c) => {
      const detail = chapterDetailByScopeId.get(c.id);
      return {
        id: c.id,
        parent_id: c.parent_scope_id!,
        name: c.name,
        slug: c.slug,
        status: (c.status as ScopeStatus | undefined) ?? 'active',
        chapter_kind: (c.chapter_kind as 'autonomous' | 'grouping' | null) ?? 'grouping',
        country_code: detail?.country_code ?? '',
        region: detail?.region ?? '',
        city: detail?.city ?? '',
        member_count: memberCountByChapter.get(c.id) ?? 0,
      };
    });

  // Branch member count: count memberships whose scope_id is the branch
  // itself. Grouping-chapter members carry a membership row against the
  // branch (grouping is a tag), so they're already counted. Autonomous
  // chapter members have their own membership at the chapter scope and
  // are correctly EXCLUDED from the branch count.
  const memberCountByBranch = new Map<string, number>();
  for (const m of memberships ?? []) {
    if (!m.scope_id) continue;
    const parentScope = scopeById.get(m.scope_id);
    if (!parentScope) continue;
    memberCountByBranch.set(m.scope_id, (memberCountByBranch.get(m.scope_id) ?? 0) + 1);
  }

  const rows: BranchRow[] = (branchRows ?? []).map((b) => {
    const scope = scopeById.get(b.scope_id);
    const chapterIds = chaptersByBranch.get(b.scope_id) ?? [];
    const autonomousCount = chapterIds.filter((id) => autonomousChapterIds.has(id)).length;
    return {
      id: b.scope_id,
      name: scope?.name ?? '—',
      slug: scope?.slug ?? '',
      status: (scope?.status as ScopeStatus | undefined) ?? 'active',
      currency_code: scope?.currency_code ?? '',
      country_code: b.country_code,
      region: b.region,
      city: b.city,
      nickname: b.nickname,
      chapter_count: chapterIds.length,
      autonomous_chapter_count: autonomousCount,
      member_count: memberCountByBranch.get(b.scope_id) ?? 0,
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

  // Stats — every branch is an organ; only autonomous chapters count as
  // organs of their own. External = branches based outside the home country.
  const branchCount = rows.length;
  const chapterCountAll = chapters.length;
  const autonomousChapterCount = rows.reduce((sum, b) => sum + b.autonomous_chapter_count, 0);
  const externalBranchCount = rows.filter((b) => isDiaspora(b.country_code)).length;
  const organCount = branchCount + autonomousChapterCount;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <ClusterPageHeader
        title="Branches & Chapters"
        subtitle="Geographic bodies where members join, register, and participate. Chapters live under a branch."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total organs" value={organCount} />
        <StatsCard label="Branches" value={branchCount} />
        <StatsCard label="Chapters" value={chapterCountAll} />
        <StatsCard label="External branches" value={externalBranchCount} />
      </div>

      <BranchesListView data={rows} chapters={chapters} canCreate={canCreate} />
    </div>
  );
}
