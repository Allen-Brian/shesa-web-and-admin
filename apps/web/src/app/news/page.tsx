import type { Metadata } from 'next';

import type { Article } from '@/components/news/news-content';
import { formatArticle } from '@/components/news/format-article';
import { NewsHero } from '@/components/news/news-hero';
import { NewsReader } from '@/components/news/news-reader';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'News',
  description: 'The official record of SHESA news, dispatches, and community milestones.',
  alternates: { canonical: '/news' },
  openGraph: {
    title: 'News',
    description: 'The official record of SHESA news, dispatches, and community milestones.',
    url: '/news',
    type: 'website',
  },
};

interface Params {
  readonly searchParams: Promise<{ id?: string; page?: string }>;
}

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
  readonly status: string;
  readonly publish_at: string | null;
  readonly created_at: string;
  readonly is_featured: boolean;
}

interface RawCategory {
  readonly id: string;
  readonly name: string;
}

interface RawMap {
  readonly article_id: string;
  readonly category_id: string;
}

/**
 * Public News page. Reads `cms.articles` + categories server-side,
 * filters to published-and-past-due, and hands two ordered arrays to
 * the hero (featured) + reader (everything).
 *
 * `?id=` selects an initial article for the reader. `?page=` is the
 * initial page for the left list.
 */
export default async function NewsPage({ searchParams }: Params) {
  const supabase = await getServerClient();
  const { id: selectedId, page: pageParam } = await searchParams;
  const initialPage = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1);

  const [{ data: articlesRaw }, { data: categoriesRaw }, { data: mapRaw }] = await Promise.all([
    supabase
      .schema('cms')
      .from('articles')
      .select(
        'id, slug, title, excerpt, content_html, banner_url, author_name, author_title, author_photo_url, status, publish_at, created_at, is_featured',
      )
      .eq('status', 'published')
      .order('publish_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }),
    supabase.schema('cms').from('article_categories').select('id, name'),
    supabase.schema('cms').from('article_categories_map').select('article_id, category_id'),
  ]);

  const catNameById = new Map(((categoriesRaw ?? []) as RawCategory[]).map((c) => [c.id, c.name]));
  const catsByArticle = new Map<string, string[]>();
  for (const m of (mapRaw ?? []) as RawMap[]) {
    const name = catNameById.get(m.category_id);
    if (!name) continue;
    const bucket = catsByArticle.get(m.article_id) ?? [];
    bucket.push(name);
    catsByArticle.set(m.article_id, bucket);
  }

  const now = Date.now();
  const articles: Article[] = ((articlesRaw ?? []) as RawArticle[])
    .filter((r) => {
      // Belt-and-braces: the query already filters status='published',
      // but a row with a future publish_at should still stay hidden.
      if (!r.publish_at) return true;
      return new Date(r.publish_at).getTime() <= now;
    })
    .map((r) => formatArticle(r, catsByArticle.get(r.id) ?? []));

  const featured = articles.filter((a) => a.isFeatured).slice(0, 8);

  return (
    <>
      <NewsHero featured={featured} />
      <NewsReader
        articles={articles}
        initialSelectedId={selectedId ?? null}
        initialPage={initialPage}
      />
    </>
  );
}
