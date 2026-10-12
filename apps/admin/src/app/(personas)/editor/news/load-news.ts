import { getServerClient } from '@/lib/supabase-server';

import type { ArticleRow, ArticleStatus, CategoryRow } from './widgets/news-widget-types';
import { loadContentMetrics, NO_METRICS } from '@/lib/content-metrics';

interface RawArticle {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string | null;
  readonly content_html: string;
  readonly banner_url: string | null;
  readonly author_name: string;
  readonly author_title: string | null;
  readonly author_photo_url: string | null;
  readonly status: ArticleStatus;
  readonly publish_at: string | null;
  readonly is_featured: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

interface RawCategory {
  readonly id: string;
  readonly name: string;
  readonly sort_order: number;
}

interface RawMap {
  readonly article_id: string;
  readonly category_id: string;
}

function normalise(
  raw: RawArticle,
  categoryIds: readonly string[],
): Omit<ArticleRow, 'views' | 'likes'> {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    excerpt: raw.excerpt,
    contentHtml: raw.content_html,
    bannerUrl: raw.banner_url,
    authorName: raw.author_name,
    authorTitle: raw.author_title,
    authorPhotoUrl: raw.author_photo_url,
    status: raw.status,
    publishAt: raw.publish_at,
    isFeatured: raw.is_featured,
    categoryIds,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export interface LoadedNews {
  readonly articles: readonly ArticleRow[];
  readonly categories: readonly CategoryRow[];
}

/**
 * Server-side loader for the editor News surface. Fetches every
 * article + every category + the map, joins the arrays client-side,
 * and returns a normalised shape ready for the widgets.
 */
export async function loadEditorNews(): Promise<LoadedNews> {
  const supabase = await getServerClient();

  const [{ data: articlesRaw }, { data: categoriesRaw }, { data: mapRaw }] = await Promise.all([
    supabase
      .schema('cms')
      .from('articles')
      .select(
        'id, slug, title, excerpt, content_html, banner_url, author_name, author_title, author_photo_url, status, publish_at, is_featured, created_at, updated_at',
      )
      .order('publish_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }),
    supabase
      .schema('cms')
      .from('article_categories')
      .select('id, name, sort_order')
      .order('sort_order'),
    supabase.schema('cms').from('article_categories_map').select('article_id, category_id'),
  ]);

  const catsByArticle = new Map<string, string[]>();
  for (const m of (mapRaw ?? []) as RawMap[]) {
    const bucket = catsByArticle.get(m.article_id) ?? [];
    bucket.push(m.category_id);
    catsByArticle.set(m.article_id, bucket);
  }

  const metrics = await loadContentMetrics('article');
  const articles: ArticleRow[] = ((articlesRaw ?? []) as RawArticle[]).map((a) => ({
    ...normalise(a, catsByArticle.get(a.id) ?? []),
    ...(metrics.get(a.id) ?? NO_METRICS),
  }));

  const categories: CategoryRow[] = ((categoriesRaw ?? []) as RawCategory[]).map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sort_order,
  }));

  return { articles, categories };
}
