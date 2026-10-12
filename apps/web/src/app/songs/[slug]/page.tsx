import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import type { PublicSongGroup } from '@/components/songs/songs-content';
import { SongDetail } from '@/components/songs/song-detail';
import { SONG_COLUMNS, toSong, type RawSong } from '@/lib/songs';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface Params {
  readonly slug: string;
}

async function loadSong(slug: string) {
  const supabase = await getServerClient();

  const { data } = await supabase
    .schema('cms')
    .from('songs')
    .select(SONG_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();

  const raw = data as RawSong | null;
  if (!raw) return null;

  // Only this song and its group. The queue used to be fetched here too —
  // the whole catalogue, twice per request, since `generateMetadata` calls
  // this as well — and it is now the layout's, which holds it across both
  // songbook routes rather than rebuilding it on every track.
  const { data: groupRow } = await supabase
    .schema('cms')
    .from('song_groups')
    .select('id, name, slug, description')
    .eq('id', raw.group_id)
    .maybeSingle();

  return { song: toSong(raw), group: (groupRow as PublicSongGroup | null) ?? null };
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await loadSong(slug);
  if (!loaded) return { title: 'Song' };

  const { song } = loaded;
  const description =
    song.description ??
    `${song.title}${song.performer ? ` — ${song.performer}` : ''}, from the SHESA songbook.`;

  return {
    title: song.title,
    description,
    alternates: { canonical: `/songs/${song.slug}` },
    openGraph: {
      type: 'music.song',
      title: song.title,
      description,
      url: `/songs/${song.slug}`,
      images: song.coverUrl ? [{ url: song.coverUrl, alt: song.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: song.title,
      description,
      images: song.coverUrl ? [song.coverUrl] : undefined,
    },
  };
}

/**
 * A single song, and the page a shared link opens.
 *
 * The player, the dock and the queue belong to `songs/layout.tsx`, which
 * spans this page and the list. Pressing play here therefore continues
 * into the songbook in the catalogue's own order, and arriving from the
 * list does not restart whatever was already playing.
 */
export default async function SongPage({ params }: { readonly params: Promise<Params> }) {
  const { slug } = await params;
  const loaded = await loadSong(slug);
  if (!loaded) notFound();

  const { song, group } = loaded;

  return <SongDetail song={song} group={group} />;
}
