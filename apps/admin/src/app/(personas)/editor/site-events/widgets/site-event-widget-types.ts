export interface CategoryRow {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
}

export interface ProgramItem {
  /**
   * ISO date (YYYY-MM-DD) for a slot on a multi-day event. Optional:
   * single-day programmes leave it blank and the public page shows one
   * undated run of times.
   */
  readonly day?: string;
  readonly time: string;
  readonly title: string;
  readonly description?: string;
}

export interface SiteEventRow {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly shortDescription: string | null;
  readonly descriptionHtml: string;
  readonly bannerUrl: string | null;
  readonly startsAt: string;
  readonly endsAt: string | null;
  readonly location: string | null;
  readonly city: string | null;
  readonly isFeatured: boolean;
  readonly hasTicketing: boolean;
  readonly ticketUrl: string | null;
  readonly ticketPrice: number | null;
  readonly ticketCurrency: string | null;
  readonly flyers: readonly string[];
  readonly program: readonly ProgramItem[];
  readonly albumSlug: string | null;
  readonly categoryIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Unique viewers, from cms.content_metrics. Zero when nobody has
   *  opened it — items with no activity have no row there. */
  readonly views: number;
  readonly likes: number;
}
