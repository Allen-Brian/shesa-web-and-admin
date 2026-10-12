/**
 * Shared shapes for the Editor dashboard — raw counts the loader
 * rolls up plus the small "recent activity" projections each panel
 * consumes.
 */

/** Portfolio-wide counts across every CMS surface. */
export interface EditorContentKpis {
  readonly totalLeaders: number;
  readonly articlesPublished: number;
  readonly articlesDraft: number;
  readonly articlesTotal: number;
  readonly siteEventsUpcoming: number;
  readonly siteEventsTotal: number;
  readonly projectsActive: number;
  readonly projectsTotal: number;
  readonly galleryAlbums: number;
  readonly gallerySize: number;
  readonly songs: number;
  readonly organs: number;
}

export interface RecentArticle {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly status: string;
  readonly publishAt: string | null;
  readonly updatedAt: string;
  readonly isFeatured: boolean;
}

export interface UpcomingSiteEvent {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly startsAt: string;
  readonly city: string | null;
  readonly isFeatured: boolean;
}

export interface FeaturedItem {
  readonly kind: 'article' | 'event' | 'project';
  readonly title: string;
  readonly slug: string;
  readonly hint: string | null;
}

export interface EditorDashboardData {
  readonly kpis: EditorContentKpis;
  readonly recentArticles: readonly RecentArticle[];
  readonly upcomingEvents: readonly UpcomingSiteEvent[];
  readonly featured: readonly FeaturedItem[];
}
