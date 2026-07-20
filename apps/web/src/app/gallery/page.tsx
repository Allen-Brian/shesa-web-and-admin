import type { Metadata } from 'next';

import { AlbumGrid } from '@/components/gallery/album-grid';
import type { Album } from '@/components/gallery/data';
import {
  formatAlbum,
  type RawAlbum,
  type RawEventStub,
  type RawMedia,
} from '@/components/gallery/format-album';
import { GalleryHero } from '@/components/gallery/gallery-hero';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Gallery · SHESA',
  description:
    'The unfiltered SHESA archive — reunions, ceremonies, community drives, and the moments in between.',
};

interface RawCategory {
  readonly id: string;
  readonly name: string;
  readonly sort_order: number;
}
interface RawMap {
  readonly album_id: string;
  readonly category_id: string;
}

/**
 * Public Gallery page. Fetches every `cms.gallery_albums` row + its
 * media + first category + linked-event slug in one round trip, and
 * hands the hero its stats and the grid its albums.
 */
export default async function GalleryPage() {
  const supabase = await getServerClient();

  const [
    { data: albumsRaw },
    { data: categoriesRaw },
    { data: mapRaw },
    { data: mediaRaw },
    { data: eventsRaw },
  ] = await Promise.all([
    supabase
      .schema('cms' as never)
      .from('gallery_albums' as never)
      .select(
        'id, slug, title, date_label, location, description, cover_url, photographer, linked_event_id',
      )
      .order('sort_order')
      .order('created_at', { ascending: false }),
    supabase
      .schema('cms' as never)
      .from('gallery_album_categories' as never)
      .select('id, name, sort_order')
      .order('sort_order'),
    supabase
      .schema('cms' as never)
      .from('gallery_album_categories_map' as never)
      .select('album_id, category_id'),
    supabase
      .schema('cms' as never)
      .from('gallery_media' as never)
      .select('id, album_id, kind, src, thumbnail_url, poster_url, alt, aspect, sort_order')
      .order('sort_order'),
    supabase
      .schema('cms' as never)
      .from('site_events' as never)
      .select('id, slug'),
  ]);

  const categories = (categoriesRaw ?? []) as RawCategory[];
  const catNameById = new Map(categories.map((c) => [c.id, c.name]));

  const primaryCatByAlbum = new Map<string, string>();
  for (const m of (mapRaw ?? []) as RawMap[]) {
    if (primaryCatByAlbum.has(m.album_id)) continue;
    const name = catNameById.get(m.category_id);
    if (name) primaryCatByAlbum.set(m.album_id, name);
  }

  const mediaByAlbum = new Map<string, RawMedia[]>();
  for (const row of (mediaRaw ?? []) as RawMedia[]) {
    const bucket = mediaByAlbum.get(row.album_id) ?? [];
    bucket.push(row);
    mediaByAlbum.set(row.album_id, bucket);
  }

  const eventSlugById = new Map(((eventsRaw ?? []) as RawEventStub[]).map((e) => [e.id, e.slug]));

  const albums: Album[] = ((albumsRaw ?? []) as RawAlbum[]).map((a) =>
    formatAlbum({
      raw: a,
      media: mediaByAlbum.get(a.id) ?? [],
      categoryName: primaryCatByAlbum.get(a.id) ?? '',
      linkedEventSlug: a.linked_event_id ? (eventSlugById.get(a.linked_event_id) ?? null) : null,
    }),
  );

  let photoCount = 0;
  let videoCount = 0;
  for (const a of albums) {
    for (const m of a.media) {
      if (m.type === 'photo') photoCount++;
      else videoCount++;
    }
  }

  const categoryNames = categories.map((c) => c.name);

  return (
    <>
      <GalleryHero albumCount={albums.length} photoCount={photoCount} videoCount={videoCount} />
      <AlbumGrid albums={albums} categories={categoryNames} />
    </>
  );
}
