/**
 * Public-site shape for songs + groups. Sourced from `cms.songs` +
 * `cms.song_groups`. The catalogue drives both the browsing UI and the
 * docked player at the bottom of the page.
 */

export interface PublicSong {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly performer: string | null;
  readonly description: string | null;
  readonly audioUrl: string;
  readonly coverUrl: string | null;
  readonly durationSeconds: number | null;
  readonly lyrics: string | null;
  readonly groupId: string;
}

export interface PublicSongGroup {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
}
