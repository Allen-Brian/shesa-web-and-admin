export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; message: string };

export interface CategoryInput {
  readonly name: string;
  readonly sortOrder: number;
}

/** Payload passed by both the create + edit forms. */
export interface ArticleInput {
  readonly slug: string;
  readonly title: string;
  readonly excerpt?: string | null;
  readonly contentHtml: string;
  readonly bannerUrl?: string | null;
  readonly authorName: string;
  readonly authorTitle?: string | null;
  readonly authorPhotoUrl?: string | null;
  readonly status: 'draft' | 'scheduled' | 'published' | 'archived';
  readonly publishAt?: string | null; // ISO date-time
  readonly isFeatured: boolean;
  /** UUIDs of `cms.article_categories`. Full set = table replacement on update. */
  readonly categoryIds: readonly string[];
}
