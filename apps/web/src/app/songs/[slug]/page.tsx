import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import type { PublicSong, PublicSongGroup } from '@/components/songs/songs-content';
import { DockedPlayer } from '@/components/songs/docked-player';
import { PlayerProvider } from '@/components/songs/player-context';
import { SongDetail } from '@/components/songs/song-detail';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface Params {
  readonly slug: string;
}

interface RawSong {
  readonly id: string;
  readonly group_id: string;
  readonly slug: string;
  readonly title: string;
  readonly performer: string | null;
  readonly description: string | null;
  readonly audio_url: string;
  readonly cover_url: string | null;
  readonly duration_seconds: number | null;
  readonly lyrics: string | null;
}

const COLUMNS =
  'id, group_id, slug, title, performer, description, audio_url, cover_url, duration_seconds, lyrics';

function toSong(r: RawSong): PublicSong {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    performer: r.performer,
    description: r.description,
    audioUrl: r.audio_url,
    coverUrl: r.cover_url,
    durationSeconds: r.duration_seconds,
    lyrics: r.lyrics,
    groupId: r.group_id,
  };
}

async function loadSong(slug: string) {
  const supabase = await getServerClient();

  const { data } = await supabase
    .schema('cms')
    .from('songs')
    .select(COLUMNS)
    .eq('slug', slug)
    .maybeSingle();

  const raw = data as RawSong | null;
  if (!raw) return null;

  const song = toSong(raw);

  // The rest of the catalogue becomes the queue, so a shared link still
  // plays on into the songbook rather than stopping dead after one track.
  const [{ data: siblings }, { data: groupRow }] = await Promise.all([
    supabase.schema('cms').from('songs').select(COLUMNS).order('sort_order').order('title'),
    supabase
      .schema('cms')
      .from('song_groups')
      .select('id, name, slug, description')
      .eq('id', raw.group_id)
      .maybeSingle(),
  ]);

  const queue = ((siblings ?? []) as RawSong[]).map(toSong);
  const group = (groupRow as PublicSongGroup | null) ?? null;

  return { song, queue: queue.length > 0 ? queue : [song], group };
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
 * It carries its own `PlayerProvider` and dock so the track can be
 * played straight from here. The queue is the whole catalogue with this
 * song first, which is what makes "play" continue into the songbook
 * instead of ending after one track.
 */
export default async function SongPage({ params }: { readonly params: Promise<Params> }) {
  const { slug } = await params;
  const loaded = await loadSong(slug);
  if (!loaded) notFound();

  const { song, queue, group } = loaded;
  const ordered = [song, ...queue.filter((s) => s.id !== song.id)];

  return (
    <PlayerProvider initialQueue={ordered}>
      <SongDetail song={song} group={group} />
      <DockedPlayer />
    </PlayerProvider>
  );
}
