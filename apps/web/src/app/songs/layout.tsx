import { DockedPlayer } from '@/components/songs/docked-player';
import { PlayerProvider } from '@/components/songs/player-context';
import { loadSongCatalogue } from '@/lib/songs';

/**
 * One player for the whole songbook.
 *
 * ─── Why this is a layout and not a per-page wrapper ───────────────────
 * The list page and the detail page each mounted their own
 * `<PlayerProvider>`, and each provider built its own `<audio>` element.
 * Navigating from a playing list to a track's page mounted a second
 * player while the first was never told to stop — so two songs played
 * over each other, and the only way out was to leave the section.
 *
 * A layout persists across navigation within `/songs`, so there is now
 * one provider, one audio element, and one queue. Playback carries over
 * when a visitor opens a track's page instead of restarting, which is
 * also what anyone expects from a music player.
 *
 * The queue is loaded here rather than per page for the same reason:
 * this list is the running order, and it should not depend on which page
 * you happened to press play from.
 */
export default async function SongsLayout({ children }: { readonly children: React.ReactNode }) {
  const songs = await loadSongCatalogue();

  return (
    <PlayerProvider initialQueue={songs}>
      {children}
      <DockedPlayer />
    </PlayerProvider>
  );
}
