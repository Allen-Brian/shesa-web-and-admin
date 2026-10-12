import type { MediaAspect, MediaKind } from '../actions/gallery-action-types';

export interface CategoryRow {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
}

/** Trimmed shape of a `cms.site_events` row used by the album linker dropdown. */
/** Just enough of an organ to offer it in the album's link picker. */
export interface LinkableOrgan {
  readonly id: string;
  readonly name: string;
}

export interface LinkableEvent {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly startsAt: string;
}

export interface MediaRow {
  readonly id: string;
  readonly kind: MediaKind;
  readonly src: string;
  readonly thumbnailUrl: string | null;
  readonly posterUrl: string | null;
  readonly alt: string | null;
  readonly aspect: MediaAspect;
  readonly sortOrder: number;
}

export interface AlbumRow {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly dateLabel: string | null;
  readonly location: string | null;
  readonly description: string | null;
  readonly coverUrl: string | null;
  readonly photographer: string | null;
  readonly linkedEventId: string | null;
  readonly linkedOrganId: string | null;
  readonly sortOrder: number;
  readonly categoryIds: readonly string[];
  readonly mediaCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Unique viewers, from cms.content_metrics. Zero when nobody has
   *  opened it — items with no activity have no row there. */
  readonly views: number;
  readonly likes: number;
}
