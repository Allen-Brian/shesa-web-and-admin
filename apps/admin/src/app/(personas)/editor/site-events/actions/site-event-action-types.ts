export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; message: string };

export interface CategoryInput {
  readonly name: string;
  readonly sortOrder: number;
}

export interface ProgramItem {
  readonly time: string;
  readonly title: string;
  readonly description?: string;
}

export interface SiteEventInput {
  readonly slug: string;
  readonly title: string;
  readonly shortDescription?: string | null;
  readonly descriptionHtml: string;
  readonly bannerUrl?: string | null;
  readonly startsAt: string; // ISO
  readonly endsAt?: string | null;
  readonly location?: string | null;
  readonly city?: string | null;
  readonly isFeatured: boolean;
  readonly hasTicketing: boolean;
  readonly ticketUrl?: string | null;
  readonly ticketPrice?: number | null;
  readonly ticketCurrency?: string | null;
  readonly flyers: readonly string[];
  readonly program: readonly ProgramItem[];
  readonly albumSlug?: string | null;
  readonly categoryIds: readonly string[];
}
