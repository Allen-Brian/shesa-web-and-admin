import type { Metadata } from 'next';

import { SongsBrowser } from '@/components/songs/songs-browser';
import { SongsHero } from '@/components/songs/songs-hero';
import { loadSongCatalogue, loadSongGroups } from '@/lib/songs';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Songs',
  description:
    'The SHESA songbook, every anthem, every chapter song, every cultural piece. Play, search, download.',
  alternates: { canonical: '/songs' },
  openGraph: {
    title: 'Songs',
    description:
      'The SHESA songbook, every anthem, every chapter song, every cultural piece. Play, search, download.',
    url: '/songs',
    type: 'website',
  },
};

/**
 * Public Songs page.
 *
 * The player and the dock live in `songs/layout.tsx` rather than here, so
 * they survive a visitor opening a track's page — previously that mounted
 * a second player and left this one still playing underneath.
 *
 * The catalogue comes from `lib/songs` for the same reason: the layout
 * builds the player's queue from that list, and this page must show the
 * songs in the order they will actually play.
 */
export default async function SongsPage() {
  const [songs, groups] = await Promise.all([loadSongCatalogue(), loadSongGroups()]);

  return (
    <>
      <SongsHero songCount={songs.length} groupCount={groups.length} />
      <SongsBrowser songs={songs} groups={groups} />
    </>
  );
}
