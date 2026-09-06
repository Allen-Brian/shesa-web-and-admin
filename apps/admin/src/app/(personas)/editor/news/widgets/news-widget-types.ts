export interface CategoryRow {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
}

export type ArticleStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface ArticleRow {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string | null;
  readonly contentHtml: string;
  readonly bannerUrl: string | null;
  readonly authorName: string;
  readonly authorTitle: string | null;
  readonly authorPhotoUrl: string | null;
  readonly status: ArticleStatus;
  readonly publishAt: string | null;
  readonly isFeatured: boolean;
  readonly categoryIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Unique viewers, from cms.content_metrics. Zero when nobody has
   *  opened it — items with no activity have no row there. */
  readonly views: number;
  readonly likes: number;
}
