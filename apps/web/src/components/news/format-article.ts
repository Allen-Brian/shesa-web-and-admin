import type { Article } from './news-content';

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
  readonly publish_at: string | null;
  readonly created_at: string;
  readonly is_featured: boolean;
}

function relativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs)) return '';
  const day = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(diffMs / day);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(diffDays / 30);
  if (months <= 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(diffDays / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

function displayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Normalise a raw `cms.articles` row + its category name list into
 * the shape the public news components consume. Handles the
 * relativeDate + displayDate derivation from publish_at.
 */
export function formatArticle(raw: RawArticle, categoryNames: readonly string[]): Article {
  const when = raw.publish_at ?? raw.created_at;
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    excerpt: raw.excerpt ?? '',
    contentHtml: raw.content_html,
    bannerUrl: raw.banner_url,
    author: {
      name: raw.author_name,
      title: raw.author_title,
      photoUrl: raw.author_photo_url,
    },
    categories: categoryNames,
    publishAt: when,
    relativeDate: relativeDate(when),
    displayDate: displayDate(when),
    isFeatured: raw.is_featured,
  };
}
