/**
 * Server helper that resolves an Exco badge for a batch of member ids.
 * Every roster / dropdown / member-facing view that displays names
 * calls this once with the visible ids and hands the returned map to
 * the client component tree, which then wraps each name in `MemberName`.
 *
 * Two-tier rule (2026-07-05 restructure — batch tier retired):
 *   - global tier: any active position_assignment whose scope is
 *     mainstream. Rendered as the gold crown medallion.
 *   - branch tier: any active position_assignment whose scope is a
 *     branch OR autonomous chapter. Rendered as the steel-blue shield.
 *
 * Batch position_assignments still exist in the catalog but don't
 * produce an Exco badge (batches aren't a governance scope after the
 * 2026-07-05 lock). They surface in a member's roles list instead.
 *
 * Members may hold multiple positions; "highest tier wins" picks
 * global > branch, and within a tier we pick by scope size (mainstream >
 * branch > chapter) then position sort_order.
 */

import type { ExcoBadgeInfo } from '@/components/governance/exco-badge';

// Any Supabase client works — we schema-scope our queries here and the
// admin's server client hands over a fully-typed one. Weakened to avoid
// generic mismatches between the client's Database + this consumer.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

interface PositionRow {
  member_id: string;
  scope_id: string;
  position_catalog_id: string;
}
interface ScopeRow {
  id: string;
  name: string;
  scope_type: 'mainstream' | 'branch' | 'chapter' | 'batch' | 'house' | 'network';
  chapter_kind: 'autonomous' | 'grouping' | null;
}
interface CatalogRow {
  id: string;
  name: string;
  sort_order: number;
}

const TIER_RANK: Record<'global' | 'branch', number> = {
  global: 0,
  branch: 1,
};
const SCOPE_RANK: Record<ScopeRow['scope_type'], number> = {
  mainstream: 0,
  branch: 1,
  chapter: 2,
  batch: 3,
  house: 4,
  network: 5,
};

export type BadgeMap = ReadonlyMap<string, ExcoBadgeInfo>;

export async function resolveMemberBadges(
  supabase: Sb,
  memberIds: readonly string[],
): Promise<BadgeMap> {
  if (memberIds.length === 0) return new Map();

  const { data: positions } = await supabase
    .schema('core')
    .from('position_assignments')
    .select('member_id, scope_id, position_catalog_id')
    .in('member_id', memberIds as string[])
    .is('removed_at', null);

  const posRows = (positions ?? []) as PositionRow[];
  if (posRows.length === 0) return new Map();

  const scopeIds = Array.from(new Set(posRows.map((p) => p.scope_id)));
  const catalogIds = Array.from(new Set(posRows.map((p) => p.position_catalog_id)));

  const [{ data: scopes }, { data: catalog }] = await Promise.all([
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, scope_type, chapter_kind')
      .in('id', scopeIds),
    supabase
      .schema('core')
      .from('position_catalog')
      .select('id, name, sort_order')
      .in('id', catalogIds),
  ]);

  const scopeById = new Map(((scopes ?? []) as ScopeRow[]).map((s) => [s.id, s]));
  const catalogById = new Map(((catalog ?? []) as CatalogRow[]).map((c) => [c.id, c]));

  // Group positions by member, then pick the primary badge.
  const byMember = new Map<string, PositionRow[]>();
  for (const p of posRows) {
    const list = byMember.get(p.member_id) ?? [];
    list.push(p);
    byMember.set(p.member_id, list);
  }

  const badges = new Map<string, ExcoBadgeInfo>();
  for (const [memberId, list] of byMember) {
    const decorated = list
      .map((p) => {
        const scope = scopeById.get(p.scope_id);
        const cat = catalogById.get(p.position_catalog_id);
        if (!scope || !cat) return null;
        // Batches don't produce Exco badges (they're not a governance
        // scope after 2026-07-05). Houses/networks were never eligible.
        if (
          scope.scope_type === 'batch' ||
          scope.scope_type === 'house' ||
          scope.scope_type === 'network'
        ) {
          return null;
        }
        const tier: 'global' | 'branch' = scope.scope_type === 'mainstream' ? 'global' : 'branch';
        return { tier, scope, cat };
      })
      .filter((x): x is { tier: 'global' | 'branch'; scope: ScopeRow; cat: CatalogRow } => !!x);
    if (decorated.length === 0) continue;

    decorated.sort((a, b) => {
      const ta = TIER_RANK[a.tier];
      const tb = TIER_RANK[b.tier];
      if (ta !== tb) return ta - tb;
      const sa = SCOPE_RANK[a.scope.scope_type];
      const sb = SCOPE_RANK[b.scope.scope_type];
      if (sa !== sb) return sa - sb;
      return a.cat.sort_order - b.cat.sort_order;
    });

    const primary = decorated[0];
    if (!primary) continue;
    badges.set(memberId, {
      tier: primary.tier,
      positionName: primary.cat.name,
      scopeLabel: primary.scope.name,
    });
  }

  return badges;
}
