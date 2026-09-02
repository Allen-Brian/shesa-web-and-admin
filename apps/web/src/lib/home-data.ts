import 'server-only';

import { getServerClient } from '@/lib/supabase-server';

/**
 * Home page data loaders.
 *
 * Each home strip (Events, Projects, Gallery, Leadership) has its own
 * "compact" shape here — a subset of the fields the corresponding
 * detail page uses. Loaders are best-effort: on any DB error they
 * return an empty array so the section falls through to its empty
 * state instead of blowing up the whole home page.
 */

const PLACEHOLDER_BANNER = '/hero_one.jpg';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export interface HomeEventItem {
  readonly title: string;
  readonly day: string;
  readonly month: string;
  readonly year: string;
  readonly location: string;
  readonly city: string;
  readonly image: string;
  readonly slug: string;
}

export interface HomeProjectItem {
  readonly title: string;
  readonly category: string;
  readonly body: string;
  readonly image: string;
  readonly slug: string;
}

export interface HomeAlbumItem {
  readonly title: string;
  readonly date: string;
  readonly photos: number;
  readonly description: string;
  readonly cover: string;
  readonly slug: string;
}

export interface HomeLeaderItem {
  readonly name: string;
  readonly role: string;
  readonly location: string;
  readonly photo: string;
  readonly slug: string;
}

/**
 * Upcoming SHESA events (starts_at >= now), oldest-first, capped at 6.
 * If none are upcoming yet, the section renders an empty state.
 */
export async function loadHomeEvents(): Promise<readonly HomeEventItem[]> {
  const supabase = await getServerClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .schema('cms')
    .from('site_events')
    .select('slug, title, banner_url, starts_at, location, city')
    .gte('starts_at', now)
    .order('starts_at', { ascending: true })
    .limit(6);
  const rows = (data ?? []) as ReadonlyArray<{
    slug: string;
    title: string;
    banner_url: string | null;
    starts_at: string;
    location: string | null;
    city: string | null;
  }>;
  return rows.map((r) => {
    const d = new Date(r.starts_at);
    return {
      title: r.title,
      day: String(d.getDate()).padStart(2, '0'),
      month: MONTH_LABELS[d.getMonth()] ?? '—',
      year: String(d.getFullYear()),
      location: r.location ?? '',
      city: r.city ?? '',
      image: r.banner_url && r.banner_url.trim() ? r.banner_url : PLACEHOLDER_BANNER,
      slug: r.slug,
    };
  });
}

/**
 * Featured projects (is_featured desc, then newest), capped at 3.
 * Body is `short_description` when available; otherwise blank so the
 * card doesn't fabricate copy.
 */
export async function loadHomeProjects(): Promise<readonly HomeProjectItem[]> {
  const supabase = await getServerClient();
  const [{ data: projectsRaw }, { data: mapRaw }, { data: categoriesRaw }] = await Promise.all([
    supabase
      .schema('cms')
      .from('projects')
      .select('id, slug, title, short_description, banner_url, is_featured')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.schema('cms').from('project_categories_map').select('project_id, category_id'),
    supabase.schema('cms').from('project_categories').select('id, name'),
  ]);
  const projects = (projectsRaw ?? []) as ReadonlyArray<{
    id: string;
    slug: string;
    title: string;
    short_description: string | null;
    banner_url: string | null;
    is_featured: boolean;
  }>;
  const catNameById = new Map(
    ((categoriesRaw ?? []) as Array<{ id: string; name: string }>).map((c) => [c.id, c.name]),
  );
  const firstCatByProject = new Map<string, string>();
  for (const m of (mapRaw ?? []) as Array<{ project_id: string; category_id: string }>) {
    if (firstCatByProject.has(m.project_id)) continue;
    const name = catNameById.get(m.category_id);
    if (name) firstCatByProject.set(m.project_id, name);
  }
  return projects.map((p) => ({
    title: p.title,
    category: firstCatByProject.get(p.id) ?? 'Project',
    body: p.short_description ?? '',
    image: p.banner_url && p.banner_url.trim() ? p.banner_url : PLACEHOLDER_BANNER,
    slug: p.slug,
  }));
}

/**
 * Recent gallery albums, newest-first, capped at 7 (enough for the
 * home fan carousel plus a couple of mobile scroll spares).
 */
export async function loadHomeAlbums(): Promise<readonly HomeAlbumItem[]> {
  const supabase = await getServerClient();

  // Columns are `date_label`, `description` and `sort_order` — this query
  // asked for `event_date`, `short_description` and `photo_count`, none of
  // which exist. PostgREST answered every call with
  // `column gallery_albums.event_date does not exist`, `data` came back null,
  // and `?? []` turned that into an empty list, so the home gallery has
  // silently rendered nothing since it shipped. The `as never` casts on the
  // query builder are what kept the compiler quiet about it.
  //
  // `date_label` is free text the editor writes ("November 2024"), not a
  // date — so it is displayed as-is rather than parsed and reformatted.
  // Ordering is by `sort_order` because a text label cannot be sorted
  // chronologically.
  const { data, error } = await supabase
    .schema('cms')
    .from('gallery_albums')
    .select('slug, title, date_label, cover_url, description, gallery_media(count)')
    .order('sort_order', { ascending: true })
    .limit(7);

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'web.home.loadHomeAlbums',
        message: 'gallery_albums query failed',
        error: error.message,
      }),
    );
    return [];
  }

  return (data ?? []).map((a) => ({
    title: a.title,
    date: a.date_label ?? '',
    // PostgREST returns an embedded aggregate as `[{ count: n }]`.
    photos: a.gallery_media?.[0]?.count ?? 0,
    description: a.description ?? '',
    cover: a.cover_url && a.cover_url.trim() ? a.cover_url : PLACEHOLDER_BANNER,
    slug: a.slug,
  }));
}

/**
 * Top-level national leaders for the home strip. Reads the mainstream
 * leaders table, keeps the first four (President, VP, SG, Treasurer,
 * whatever the CMS ordered them by) and maps to a compact card shape.
 * The full leadership tree lives at /leadership.
 */
export async function loadHomeLeaders(): Promise<readonly HomeLeaderItem[]> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .schema('cms')
    .from('mainstream_leaders')
    .select('id, name, position, location, photo_url, sort_order')
    .order('sort_order', { ascending: true })
    .limit(4);
  const rows = (data ?? []) as ReadonlyArray<{
    id: string;
    name: string;
    position: string;
    location: string | null;
    photo_url: string | null;
    sort_order: number | null;
  }>;
  return rows.map((l) => ({
    name: l.name,
    role: l.position,
    location: l.location ?? '',
    photo: l.photo_url && l.photo_url.trim() ? l.photo_url : '/president_one.jpg',
    slug: l.id,
  }));
}
