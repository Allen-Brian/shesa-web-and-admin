export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; message: string };

export type MediaAspect = '1/1' | '3/4' | '4/3' | '3/2' | '2/3' | '16/9' | '9/16';

export type MediaKind = 'photo' | 'video';

export interface CategoryInput {
  readonly name: string;
  readonly sortOrder: number;
}

export interface AlbumInput {
  readonly slug: string;
  readonly title: string;
  readonly dateLabel?: string | null;
  readonly location?: string | null;
  readonly description?: string | null;
  readonly coverUrl?: string | null;
  readonly photographer?: string | null;
  readonly linkedEventId?: string | null;
  /** Ties the album to a branch or chapter, so its page shows these pictures. */
  readonly linkedOrganId?: string | null;
  readonly sortOrder: number;
  readonly categoryIds: readonly string[];
}

export interface MediaInput {
  readonly albumId: string;
  readonly kind: MediaKind;
  readonly src: string;
  readonly thumbnailUrl?: string | null;
  readonly posterUrl?: string | null;
  readonly alt?: string | null;
  readonly aspect: MediaAspect;
  readonly sortOrder: number;
}
