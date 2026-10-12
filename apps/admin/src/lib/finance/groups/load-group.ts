import 'server-only';

import { getServerClient } from '@/lib/supabase-server';

export type GroupStatus = 'active' | 'closed' | 'archived';

export interface GroupDetail {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: GroupStatus;
  readonly showInSidebar: boolean;
  readonly startsOn: string | null;
  readonly endsOn: string | null;
  readonly scopeId: string;
  readonly createdAt: string;
}

export interface GroupSubNavItem {
  readonly chargeId: string;
  readonly name: string;
  readonly shape: string;
}

interface RawGroup {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: GroupStatus;
  readonly show_in_sidebar: boolean;
  readonly starts_on: string | null;
  readonly ends_on: string | null;
  readonly scope_id: string;
  readonly created_at: string;
}

interface RawContribution {
  readonly id: string;
  readonly name: string;
  readonly shape: string;
}

/**
 * Resolve a group by slug. Returns `null` when the row is missing or
 * invisible to the caller (RLS filters branch users out entirely).
 * Pages should `notFound()` on null.
 */
export async function loadGroupBySlug(slug: string): Promise<GroupDetail | null> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .schema('finance')
    .from('groups')
    .select(
      'id, slug, name, description, status, show_in_sidebar, starts_on, ends_on, scope_id, created_at',
    )
    .eq('slug', slug)
    .maybeSingle();
  const row = data as RawGroup | null;
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: row.status,
    showInSidebar: row.show_in_sidebar,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    scopeId: row.scope_id,
    createdAt: row.created_at,
  };
}

/**
 * Contribution-shape charges (ticketed / fixed) inside this group.
 * These become dynamic entries in the group's sub-nav Contributions
 * flyout — each one links to its own contribution-detail sub-page.
 */
export async function loadGroupContributions(groupId: string): Promise<readonly GroupSubNavItem[]> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .schema('finance')
    .from('charges')
    .select('id, name, shape')
    .eq('group_id', groupId)
    .in('shape', ['ticketed', 'fixed'])
    .order('created_at');
  return ((data ?? []) as RawContribution[]).map((c) => ({
    chargeId: c.id,
    name: c.name,
    shape: c.shape,
  }));
}
