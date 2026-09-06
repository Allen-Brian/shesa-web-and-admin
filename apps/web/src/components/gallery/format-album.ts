import type { Album, MediaItem } from './gallery-content';

export interface RawAlbum {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly date_label: string | null;
  readonly location: string | null;
  readonly description: string | null;
  readonly cover_url: string | null;
  readonly photographer: string | null;
  readonly linked_event_id: string | null;
}

export interface RawMedia {
  readonly id: string;
  readonly album_id: string;
  readonly kind: string;
  readonly src: string;
  readonly thumbnail_url: string | null;
  readonly poster_url: string | null;
  readonly alt: string | null;
  readonly aspect: string;
  readonly sort_order: number;
}

export interface RawEventStub {
  readonly id: string;
  readonly slug: string;
}

const PLACEHOLDER_COVER = '/hero_one.jpg';
const KNOWN_ASPECTS = new Set<MediaItem['aspect']>([
  '1/1',
  '3/4',
  '4/3',
  '3/2',
  '2/3',
  '16/9',
  '9/16',
]);

function toAspect(v: string): MediaItem['aspect'] {
  return KNOWN_ASPECTS.has(v as MediaItem['aspect']) ? (v as MediaItem['aspect']) : '4/3';
}

function toMedia(raw: RawMedia): MediaItem {
  return {
    id: raw.id,
    type: raw.kind === 'video' ? 'video' : 'photo',
    src: raw.src,
    thumbnail: raw.thumbnail_url ?? undefined,
    poster: raw.poster_url ?? undefined,
    alt: raw.alt ?? '',
    aspect: toAspect(raw.aspect),
  };
}

interface FormatArgs {
  readonly raw: RawAlbum;
  readonly media: readonly RawMedia[];
  readonly categoryName: string;
  readonly linkedEventSlug: string | null;
}

/**
 * Normalise a raw `cms.gallery_albums` row + its ordered media + first
 * category into the public `Album` shape used by every gallery
 * component. Any missing DB values fall back to sensible defaults so
 * the public page never crashes on a partially-filled album.
 */
export function formatAlbum({ raw, media, categoryName, linkedEventSlug }: FormatArgs): Album {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    date: raw.date_label ?? '',
    location: raw.location ?? '',
    description: raw.description ?? '',
    cover: raw.cover_url ?? PLACEHOLDER_COVER,
    category: categoryName || 'General',
    photographer: raw.photographer ?? undefined,
    linkedEventSlug,
    media: media.map(toMedia),
  };
}
