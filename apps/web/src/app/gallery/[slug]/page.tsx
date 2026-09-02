import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AlbumDetail } from '@/components/gallery/album-detail';
import { formatAlbum, type RawAlbum, type RawMedia } from '@/components/gallery/format-album';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface Params {
  readonly slug: string;
}

interface RawCategory {
  readonly id: string;
  readonly name: string;
}
interface RawMap {
  readonly category_id: string;
}

/** Fetches a single album by slug + its media + first category + linked event slug. */
async function loadAlbum(slug: string) {
  const supabase = await getServerClient();

  const { data: albumRaw } = await supabase
    .schema('cms')
    .from('gallery_albums')
    .select(
      'id, slug, title, date_label, location, description, cover_url, photographer, linked_event_id',
    )
    .eq('slug', slug)
    .maybeSingle();
  if (!albumRaw) return null;
  const album = albumRaw as RawAlbum;

  const [{ data: mediaRaw }, { data: mapRaw }, linkedEventRes] = await Promise.all([
    supabase
      .schema('cms')
      .from('gallery_media')
      .select('id, album_id, kind, src, thumbnail_url, poster_url, alt, aspect, sort_order')
      .eq('album_id', album.id)
      .order('sort_order'),
    supabase
      .schema('cms')
      .from('gallery_album_categories_map')
      .select('category_id, gallery_album_categories(id, name)')
      .eq('album_id', album.id),
    album.linked_event_id
      ? supabase
          .schema('cms')
          .from('site_events')
          .select('slug')
          .eq('id', album.linked_event_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  interface MapWithJoin extends RawMap {
    readonly gallery_album_categories: RawCategory | null;
  }
  const firstCat = ((mapRaw ?? []) as MapWithJoin[])[0]?.gallery_album_categories?.name ?? '';
  const linkedEventSlug = (linkedEventRes.data as { slug: string } | null)?.slug ?? null;

  return formatAlbum({
    raw: album,
    media: (mediaRaw ?? []) as RawMedia[],
    categoryName: firstCat,
    linkedEventSlug,
  });
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const album = await loadAlbum(slug);
  if (!album) return { title: 'Album · SHESA' };
  return {
    title: `${album.title} · SHESA Gallery`,
    description: album.description,
  };
}

export default async function AlbumPage({ params }: { readonly params: Promise<Params> }) {
  const { slug } = await params;
  const album = await loadAlbum(slug);
  if (!album) notFound();
  return <AlbumDetail album={album} />;
}
