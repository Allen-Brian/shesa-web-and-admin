import type { Metadata } from 'next';

import type { PublicSong, PublicSongGroup } from '@/components/songs/data';
import { DockedPlayer } from '@/components/songs/docked-player';
import { PlayerProvider } from '@/components/songs/player-context';
import { SongsBrowser } from '@/components/songs/songs-browser';
import { SongsHero } from '@/components/songs/songs-hero';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Songs · SHESA',
  description:
    'The SHESA songbook, every anthem, every chapter song, every cultural piece. Play, search, download.',
};

interface RawGroup {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly sort_order: number;
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

/**
 * Public Songs page. Wraps the hero + browser + docked player in a
 * shared `<PlayerProvider>` so a single audio element survives the
 * whole page, a card click starts the same track the dock is showing.
 */
export default async function SongsPage() {
  const supabase = await getServerClient();

  const [{ data: songsRaw }, { data: groupsRaw }] = await Promise.all([
    supabase
      .schema('cms' as never)
      .from('songs' as never)
      .select(
        'id, group_id, slug, title, performer, description, audio_url, cover_url, duration_seconds, lyrics',
      )
      .order('sort_order')
      .order('title'),
    supabase
      .schema('cms' as never)
      .from('song_groups' as never)
      .select('id, name, slug, description, sort_order')
      .order('sort_order'),
  ]);

  const songs = ((songsRaw ?? []) as RawSong[]).map(toSong);
  const groups: PublicSongGroup[] = ((groupsRaw ?? []) as RawGroup[]).map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    description: g.description,
  }));

  return (
    <PlayerProvider initialQueue={songs}>
      <SongsHero songCount={songs.length} groupCount={groups.length} />
      <SongsBrowser songs={songs} groups={groups} />
      <DockedPlayer />
    </PlayerProvider>
  );
}
