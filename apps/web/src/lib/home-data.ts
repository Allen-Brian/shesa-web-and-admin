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

/** How many events the home strip carries. */
const HOME_EVENT_COUNT = 10;

/**
 * The offices the home leadership strip shows, in the order they are
 * shown: President General, Vice President General, Secretary General,
 * Assistant Secretary General, Financial Secretary.
 *
 * Each entry tests a position string. "Assistant" is checked before the
 * plain Secretary General so the deputy cannot be picked up as the
 * principal, and "Vice" likewise for the President General.
 */
const HOME_LEADER_ORDER: readonly ((position: string) => boolean)[] = [
  (p) => /president/i.test(p) && !/vice|assistant|deputy|past/i.test(p),
  (p) => /president/i.test(p) && /vice|deputy/i.test(p),
  (p) => /secretary/i.test(p) && /general/i.test(p) && !/assistant|deputy/i.test(p),
  (p) => /secretary/i.test(p) && /general/i.test(p) && /assistant|deputy/i.test(p),
  (p) => /financ/i.test(p) && /secretary|treasur/i.test(p),
];

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
  readonly id: string;
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
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly photos: number;
  readonly description: string;
  readonly cover: string;
  readonly slug: string;
}

export interface HomeNewsItem {
  readonly id: string;
  readonly title: string;
  readonly excerpt: string;
  readonly image: string;
  readonly date: string;
  readonly category: string;
  readonly author: string;
}

export interface HomeLeaderItem {
  readonly name: string;
  readonly role: string;
  readonly location: string;
  readonly photo: string;
  readonly slug: string;
}

/**
 * The ten events the home strip shows: everything upcoming, soonest
 * first, topped up with the most recent past gatherings. Only an empty
 * calendar leaves the section on its empty state now.
 */
export async function loadHomeEvents(): Promise<readonly HomeEventItem[]> {
  const supabase = await getServerClient();
  const now = new Date().toISOString();

  const columns = 'id, slug, title, banner_url, starts_at, location, city';

  // Ten events: what is coming, soonest first, then the most recent
  // gatherings to fill the strip. A quiet stretch in the calendar used
  // to leave the home page with an empty events section; the archive
  // now carries it.
  const [{ data: upcomingData }, { data: pastData }] = await Promise.all([
    supabase
      .schema('cms')
      .from('site_events')
      .select(columns)
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(HOME_EVENT_COUNT),
    supabase
      .schema('cms')
      .from('site_events')
      .select(columns)
      .lt('starts_at', now)
      .order('starts_at', { ascending: false })
      .limit(HOME_EVENT_COUNT),
  ]);

  type Row = {
    id: string;
    slug: string;
    title: string;
    banner_url: string | null;
    starts_at: string;
    location: string | null;
    city: string | null;
  };

  const upcoming = (upcomingData ?? []) as ReadonlyArray<Row>;
  const past = (pastData ?? []) as ReadonlyArray<Row>;
  const rows = [...upcoming, ...past].slice(0, HOME_EVENT_COUNT);
  return rows.map((r) => {
    const d = new Date(r.starts_at);
    return {
      id: r.id,
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
    .select('id, slug, title, date_label, cover_url, description, gallery_media(count)')
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
    id: a.id,
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
 * The five principal officers for the home strip, in protocol order —
 * see HOME_LEADER_ORDER. The full leadership tree lives at /leadership.
 */
export async function loadHomeLeaders(): Promise<readonly HomeLeaderItem[]> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .schema('cms')
    .from('mainstream_leaders')
    .select('id, name, position, location, photo_url, sort_order')
    .order('sort_order', { ascending: true });
  const rows = (data ?? []) as ReadonlyArray<{
    id: string;
    name: string;
    position: string;
    location: string | null;
    photo_url: string | null;
    sort_order: number | null;
  }>;

  // Five specific offices, in protocol order, rather than whichever
  // four happened to sort first. Matched on the position text because
  // the CMS has no role key — loosely, so "Financial Secretary" and
  // "Finance Secretary" both land, and an office the CMS has not filled
  // is simply left out rather than shifting the rest up.
  const matched = HOME_LEADER_ORDER.map((matches) => rows.find((r) => matches(r.position))).filter(
    (r): r is (typeof rows)[number] => r !== undefined,
  );

  return matched.map((l) => ({
    name: l.name,
    role: l.position,
    location: l.location ?? '',
    photo: l.photo_url && l.photo_url.trim() ? l.photo_url : '/president_one.jpg',
    slug: l.id,
  }));
}

/**
 * The three most recent published articles for the home strip. Ordered
 * by publish_at, falling back to created_at for anything published
 * without a date. Articles open at `/news?id=…`; there is no per-article
 * route.
 */
export async function loadHomeNews(): Promise<readonly HomeNewsItem[]> {
  const supabase = await getServerClient();

  const [{ data: articlesRaw }, { data: categoriesRaw }, { data: mapRaw }] = await Promise.all([
    supabase
      .schema('cms')
      .from('articles')
      .select('id, title, excerpt, banner_url, author_name, publish_at, created_at')
      .eq('status', 'published')
      .order('publish_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.schema('cms').from('article_categories').select('id, name'),
    supabase.schema('cms').from('article_categories_map').select('article_id, category_id'),
  ]);

  const articles = (articlesRaw ?? []) as ReadonlyArray<{
    id: string;
    title: string;
    excerpt: string | null;
    banner_url: string | null;
    author_name: string | null;
    publish_at: string | null;
    created_at: string;
  }>;

  const catNameById = new Map(
    ((categoriesRaw ?? []) as Array<{ id: string; name: string }>).map((c) => [c.id, c.name]),
  );
  const firstCatByArticle = new Map<string, string>();
  for (const m of (mapRaw ?? []) as Array<{ article_id: string; category_id: string }>) {
    if (firstCatByArticle.has(m.article_id)) continue;
    const name = catNameById.get(m.category_id);
    if (name) firstCatByArticle.set(m.article_id, name);
  }

  return articles.map((a) => {
    const when = new Date(a.publish_at ?? a.created_at);
    return {
      id: a.id,
      title: a.title,
      excerpt: a.excerpt ?? '',
      image: a.banner_url && a.banner_url.trim() ? a.banner_url : PLACEHOLDER_BANNER,
      date: `${MONTH_LABELS[when.getMonth()] ?? ''} ${when.getDate()}, ${when.getFullYear()}`,
      category: firstCatByArticle.get(a.id) ?? 'News',
      author: a.author_name ?? '',
    };
  });
}
