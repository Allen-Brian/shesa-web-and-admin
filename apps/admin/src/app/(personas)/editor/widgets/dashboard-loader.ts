import 'server-only';

import { getServerClient } from '@/lib/supabase-server';

import type { EditorDashboardData } from './dashboard-types';
import { toFeaturedItems, toRecentArticles, toUpcomingEvents } from './dashboard-projections';

const RECENT_ARTICLE_LIMIT = 5;
const UPCOMING_EVENT_LIMIT = 4;

/**
 * Server-only loader for the Editor dashboard.
 *
 * Fans out one head-count-only query per CMS surface so the KPI strip
 * stays cheap even when the catalogue is large, plus the small
 * "recent activity" projections the two list panels + featured strip
 * render. RLS on cms.* opens SELECT to authenticated + anon
 * (public-facing content), so no scope filter is needed here — the
 * layout already gates the persona to holders of `cms.edit`.
 */
export async function loadEditorDashboard(): Promise<EditorDashboardData> {
  const supabase = await getServerClient();
  const cms = supabase.schema('cms');
  const nowIso = new Date().toISOString();

  const [
    { count: articlesPublished },
    { count: articlesDraft },
    { count: articlesTotal },
    { count: siteEventsUpcoming },
    { count: siteEventsTotal },
    { count: projectsActive },
    { count: projectsTotal },
    { count: galleryAlbums },
    { count: gallerySize },
    { count: songs },
    { count: organs },
    { count: mainstreamLeaders },
    { count: branchLeaders },
    { count: diasporaLeaders },
    { count: batchLeaders },
    { data: recentArticlesRaw },
    { data: upcomingEventsRaw },
    { data: featuredArticleRaw },
    { data: featuredEventRaw },
    { data: featuredProjectRaw },
  ] = await Promise.all([
    cms.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    cms.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    cms.from('articles').select('id', { count: 'exact', head: true }),
    cms.from('site_events').select('id', { count: 'exact', head: true }).gte('starts_at', nowIso),
    cms.from('site_events').select('id', { count: 'exact', head: true }),
    cms
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .in('status', ['Active', 'Ongoing', 'Fundraising']),
    cms.from('projects').select('id', { count: 'exact', head: true }),
    cms.from('gallery_albums').select('id', { count: 'exact', head: true }),
    cms.from('gallery_media').select('id', { count: 'exact', head: true }),
    cms.from('songs').select('id', { count: 'exact', head: true }),
    cms.from('organs').select('id', { count: 'exact', head: true }),
    cms.from('mainstream_leaders').select('id', { count: 'exact', head: true }),
    cms.from('branch_leaders').select('id', { count: 'exact', head: true }),
    cms.from('diaspora_leaders').select('id', { count: 'exact', head: true }),
    cms.from('batch_leaders').select('id', { count: 'exact', head: true }),
    cms
      .from('articles')
      .select('id, title, slug, status, publish_at, updated_at, is_featured')
      .order('updated_at', { ascending: false })
      .limit(RECENT_ARTICLE_LIMIT),
    cms
      .from('site_events')
      .select('id, title, slug, starts_at, city, is_featured')
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true })
      .limit(UPCOMING_EVENT_LIMIT),
    cms
      .from('articles')
      .select('title, slug, status')
      .eq('is_featured', true)
      .eq('status', 'published')
      .limit(1),
    cms.from('site_events').select('title, slug, starts_at').eq('is_featured', true).limit(1),
    cms.from('projects').select('title, slug, status').eq('is_featured', true).limit(1),
  ]);

  const totalLeaders =
    (mainstreamLeaders ?? 0) + (branchLeaders ?? 0) + (diasporaLeaders ?? 0) + (batchLeaders ?? 0);

  return {
    kpis: {
      totalLeaders,
      articlesPublished: articlesPublished ?? 0,
      articlesDraft: articlesDraft ?? 0,
      articlesTotal: articlesTotal ?? 0,
      siteEventsUpcoming: siteEventsUpcoming ?? 0,
      siteEventsTotal: siteEventsTotal ?? 0,
      projectsActive: projectsActive ?? 0,
      projectsTotal: projectsTotal ?? 0,
      galleryAlbums: galleryAlbums ?? 0,
      gallerySize: gallerySize ?? 0,
      songs: songs ?? 0,
      organs: organs ?? 0,
    },
    recentArticles: toRecentArticles(recentArticlesRaw ?? []),
    upcomingEvents: toUpcomingEvents(upcomingEventsRaw ?? []),
    featured: toFeaturedItems({
      article: featuredArticleRaw ?? null,
      event: featuredEventRaw ?? null,
      project: featuredProjectRaw ?? null,
    }),
  };
}
