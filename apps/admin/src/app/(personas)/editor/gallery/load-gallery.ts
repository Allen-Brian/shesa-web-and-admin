import { getServerClient } from '@/lib/supabase-server';
import { loadContentMetrics, NO_METRICS } from '@/lib/content-metrics';

import type { MediaAspect, MediaKind } from './actions/gallery-action-types';
import type {
  AlbumRow,
  CategoryRow,
  LinkableEvent,
  LinkableOrgan,
  MediaRow,
} from './widgets/gallery-widget-types';

interface RawAlbum {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly date_label: string | null;
  readonly location: string | null;
  readonly description: string | null;
  readonly cover_url: string | null;
  readonly photographer: string | null;
  readonly linked_event_id: string | null;
  readonly linked_organ_id: string | null;
  readonly sort_order: number;
  readonly created_at: string;
  readonly updated_at: string;
}

interface RawCategory {
  readonly id: string;
  readonly name: string;
  readonly sort_order: number;
}

interface RawMap {
  readonly album_id: string;
  readonly category_id: string;
}

interface RawMedia {
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

interface RawEvent {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly starts_at: string;
}

function normaliseAlbum(
  raw: RawAlbum,
  categoryIds: readonly string[],
  mediaCount: number,
): Omit<AlbumRow, 'views' | 'likes'> {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    dateLabel: raw.date_label,
    location: raw.location,
    description: raw.description,
    coverUrl: raw.cover_url,
    photographer: raw.photographer,
    linkedEventId: raw.linked_event_id,
    linkedOrganId: raw.linked_organ_id,
    sortOrder: raw.sort_order,
    categoryIds,
    mediaCount,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function normaliseMedia(raw: RawMedia): MediaRow {
  return {
    id: raw.id,
    kind: (raw.kind === 'video' ? 'video' : 'photo') as MediaKind,
    src: raw.src,
    thumbnailUrl: raw.thumbnail_url,
    posterUrl: raw.poster_url,
    alt: raw.alt,
    aspect: raw.aspect as MediaAspect,
    sortOrder: raw.sort_order,
  };
}

export interface LoadedGallery {
  readonly albums: readonly AlbumRow[];
  readonly categories: readonly CategoryRow[];
  readonly events: readonly LinkableEvent[];
  readonly organs: readonly LinkableOrgan[];
}

/** Server-side loader for the editor Gallery list surface. */
export async function loadEditorGallery(): Promise<LoadedGallery> {
  const supabase = await getServerClient();

  const [
    { data: albumsRaw },
    { data: categoriesRaw },
    { data: mapRaw },
    { data: mediaRaw },
    { data: eventsRaw },
    { data: organsRaw },
  ] = await Promise.all([
    supabase
      .schema('cms')
      .from('gallery_albums')
      .select(
        'id, slug, title, date_label, location, description, cover_url, photographer, linked_event_id, linked_organ_id, sort_order, created_at, updated_at',
      )
      .order('sort_order')
      .order('created_at', { ascending: false }),
    supabase
      .schema('cms')
      .from('gallery_album_categories')
      .select('id, name, sort_order')
      .order('sort_order'),
    supabase.schema('cms').from('gallery_album_categories_map').select('album_id, category_id'),
    supabase.schema('cms').from('gallery_media').select('id, album_id'),
    supabase
      .schema('cms')
      .from('site_events')
      .select('id, slug, title, starts_at')
      .order('starts_at', { ascending: false }),
    supabase.schema('cms').from('organs').select('id, name').order('name'),
  ]);

  const catsByAlbum = new Map<string, string[]>();
  for (const m of (mapRaw ?? []) as RawMap[]) {
    const bucket = catsByAlbum.get(m.album_id) ?? [];
    bucket.push(m.category_id);
    catsByAlbum.set(m.album_id, bucket);
  }

  const countByAlbum = new Map<string, number>();
  for (const row of (mediaRaw ?? []) as { readonly album_id: string }[]) {
    countByAlbum.set(row.album_id, (countByAlbum.get(row.album_id) ?? 0) + 1);
  }

  const metrics = await loadContentMetrics('album');
  const albums: AlbumRow[] = ((albumsRaw ?? []) as RawAlbum[]).map((a) => ({
    ...normaliseAlbum(a, catsByAlbum.get(a.id) ?? [], countByAlbum.get(a.id) ?? 0),
    ...(metrics.get(a.id) ?? NO_METRICS),
  }));

  const categories: CategoryRow[] = ((categoriesRaw ?? []) as RawCategory[]).map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sort_order,
  }));

  const events: LinkableEvent[] = ((eventsRaw ?? []) as RawEvent[]).map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    startsAt: e.starts_at,
  }));

  const organs = (organsRaw ?? []) as LinkableOrgan[];

  return { albums, categories, events, organs };
}

/** Media items for a single album, ordered by sort_order for the edit page. */
export async function loadAlbumMedia(albumId: string): Promise<readonly MediaRow[]> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .schema('cms')
    .from('gallery_media')
    .select('id, album_id, kind, src, thumbnail_url, poster_url, alt, aspect, sort_order')
    .eq('album_id', albumId)
    .order('sort_order');
  return ((data ?? []) as RawMedia[]).map(normaliseMedia);
}
