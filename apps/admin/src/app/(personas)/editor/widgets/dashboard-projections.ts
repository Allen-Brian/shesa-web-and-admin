import type { FeaturedItem, RecentArticle, UpcomingSiteEvent } from './dashboard-types';

/**
 * Row-shape projections — hand the loader raw Supabase rows, get
 * back the dashboard-friendly shapes. Kept out of the loader file so
 * the async data-fetch stays layout-focused and the row → view
 * mapping is trivially unit-testable.
 */

interface RawArticle {
  id: string;
  title: string;
  slug: string;
  status: string;
  publish_at: string | null;
  updated_at: string;
  is_featured: boolean;
}

export function toRecentArticles(rows: readonly unknown[]): RecentArticle[] {
  return (rows as RawArticle[]).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    publishAt: row.publish_at,
    updatedAt: row.updated_at,
    isFeatured: row.is_featured,
  }));
}

interface RawSiteEvent {
  id: string;
  title: string;
  slug: string;
  starts_at: string;
  city: string | null;
  is_featured: boolean;
}

export function toUpcomingEvents(rows: readonly unknown[]): UpcomingSiteEvent[] {
  return (rows as RawSiteEvent[]).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    startsAt: row.starts_at,
    city: row.city,
    isFeatured: row.is_featured,
  }));
}

interface RawFeaturedArticle {
  title: string;
  slug: string;
  status: string;
}
interface RawFeaturedEvent {
  title: string;
  slug: string;
  starts_at: string;
}
interface RawFeaturedProject {
  title: string;
  slug: string;
  status: string;
}

/**
 * Merge the three per-kind featured queries into one `FeaturedItem[]`.
 * Nothing-featured queries return an empty array, not null; the merge
 * skips absent entries so an unfeatured site still renders a clean
 * "nothing featured" empty state without ever pushing an undefined
 * entry.
 */
export function toFeaturedItems(input: {
  article: readonly unknown[] | null;
  event: readonly unknown[] | null;
  project: readonly unknown[] | null;
}): FeaturedItem[] {
  const items: FeaturedItem[] = [];
  const article = ((input.article ?? []) as RawFeaturedArticle[])[0];
  if (article) {
    items.push({
      kind: 'article',
      title: article.title,
      slug: article.slug,
      hint: 'Article on the News hero',
    });
  }
  const event = ((input.event ?? []) as RawFeaturedEvent[])[0];
  if (event) {
    const when = new Date(event.starts_at);
    items.push({
      kind: 'event',
      title: event.title,
      slug: event.slug,
      hint: Number.isFinite(when.getTime())
        ? `Event on ${when.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
        : 'Featured event',
    });
  }
  const project = ((input.project ?? []) as RawFeaturedProject[])[0];
  if (project) {
    items.push({
      kind: 'project',
      title: project.title,
      slug: project.slug,
      hint: `Project · ${project.status}`,
    });
  }
  return items;
}
