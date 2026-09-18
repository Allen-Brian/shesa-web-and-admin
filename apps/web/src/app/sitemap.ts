import type { MetadataRoute } from 'next';

import { clientEnv } from '@shesa/config/env.client';

import { getServerClient } from '@/lib/supabase-server';

/**
 * The sitemap, built from the CMS at request time.
 *
 * Static routes are listed by hand with a priority that reflects how
 * much of the association's story they carry; the event, project, and
 * album pages are read from the database so a newly published item is
 * discoverable without anyone remembering to touch this file.
 *
 * `lastModified` comes from each row's `updated_at` where there is one:
 * crawlers use it to decide what to re-fetch, and a date that never
 * changes teaches them to stop looking.
 */

export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

const STATIC_ROUTES: readonly {
  path: string;
  priority: number;
  changeFrequency: Entry['changeFrequency'];
}[] = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/presidents-address', priority: 0.7, changeFrequency: 'yearly' },
  { path: '/leadership', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/organs', priority: 0.6, changeFrequency: 'yearly' },
  { path: '/news', priority: 0.9, changeFrequency: 'daily' },
  { path: '/events', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/projects', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/gallery', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/songs', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/strategic-plan', priority: 0.7, changeFrequency: 'yearly' },
  { path: '/agm-2026', priority: 0.95, changeFrequency: 'weekly' },
  { path: '/awards', priority: 0.9, changeFrequency: 'daily' },
  // The public ballot only. `/awards/exco/<token>` is deliberately absent —
  // listing it here would publish the secret that makes it an Exco ballot.
  { path: '/awards/vote', priority: 0.8, changeFrequency: 'daily' },
  { path: '/agm-2026/sponsor', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/sponsors', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.2, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = clientEnv.NEXT_PUBLIC_WEB_APP_URL.replace(/\/+$/, '');
  const now = new Date();

  const entries: Entry[] = STATIC_ROUTES.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // A sitemap is a nicety; a database hiccup must not take the route
  // down with it, so every query is best-effort.
  try {
    const supabase = await getServerClient();

    const [{ data: events }, { data: projects }, { data: albums }, { data: songs }] =
      await Promise.all([
        supabase.schema('cms').from('site_events').select('slug, updated_at'),
        supabase.schema('cms').from('projects').select('slug, updated_at'),
        supabase.schema('cms').from('gallery_albums').select('slug, updated_at'),
        supabase.schema('cms').from('songs').select('slug, updated_at'),
      ]);

    const push = (rows: unknown, prefix: string, priority: number) => {
      for (const row of (rows ?? []) as ReadonlyArray<{
        slug: string;
        updated_at: string | null;
      }>) {
        if (!row.slug) continue;
        entries.push({
          url: `${base}${prefix}/${row.slug}`,
          lastModified: row.updated_at ? new Date(row.updated_at) : now,
          changeFrequency: 'monthly',
          priority,
        });
      }
    };

    push(events, '/events', 0.8);
    push(projects, '/projects', 0.7);
    push(albums, '/gallery', 0.6);
    push(songs, '/songs', 0.6);
  } catch {
    /* Static routes alone still make a valid sitemap. */
  }

  return entries;
}
