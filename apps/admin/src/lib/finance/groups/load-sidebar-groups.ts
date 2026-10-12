import 'server-only';

import { getServerClient } from '@/lib/supabase-server';

export interface SidebarGroupItem {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
}

interface RawGroup {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly show_in_sidebar: boolean;
  readonly status: string;
}

/**
 * Sidebar-visible groups for the current caller. Filters to active +
 * closed groups (archived groups drop out of the sidebar) with the
 * `show_in_sidebar` toggle on. Returns an empty list for anyone the
 * RLS policy blocks (branch finance users), which the sidebar reads
 * as "hide the Event Groups section entirely".
 */
export async function loadSidebarGroups(): Promise<readonly SidebarGroupItem[]> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .schema('finance')
    .from('groups')
    .select('id, slug, name, show_in_sidebar, status')
    .eq('show_in_sidebar', true)
    .in('status', ['active', 'closed'])
    .order('name');
  const rows = (data ?? []) as RawGroup[];
  return rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name }));
}
