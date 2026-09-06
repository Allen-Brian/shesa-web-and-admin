/**
 * Types shared across the public gallery components. All data now flows
 * from `cms.gallery_*` at request time, see `format-album.ts` for the
 * normaliser that maps DB rows into these shapes.
 */

export type MediaItem = {
  readonly id: string;
  readonly type: 'photo' | 'video';
  /** Full-resolution source (image URL, or video URL). */
  readonly src: string;
  /** Optional smaller thumbnail, falls back to `src` when omitted. */
  readonly thumbnail?: string;
  /** Poster still for videos. */
  readonly poster?: string;
  readonly alt: string;
  /** Intrinsic aspect ratio, used for masonry/lightbox layout. */
  readonly aspect: '1/1' | '3/4' | '4/3' | '3/2' | '2/3' | '16/9' | '9/16';
};

export type Album = {
  /** The CMS row id, used to key view and like counts. */
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly date: string;
  readonly location: string;
  readonly description: string;
  readonly cover: string;
  readonly category: string;
  readonly photographer?: string;
  readonly linkedEventSlug: string | null;
  readonly media: readonly MediaItem[];
};

export const ALL_CATEGORY = 'All' as const;
