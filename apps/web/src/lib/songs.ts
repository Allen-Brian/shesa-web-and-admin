import type { PublicSong, PublicSongGroup } from '@/components/songs/songs-content';

import { getServerClient } from './supabase-server';

/**
 * Loading the songbook, in one place.
 *
 * The catalogue query lived twice — once on the list page, once on the
 * detail page — with its own copy of the column list and the row mapper
 * each time. They had already drifted in what order they asked for, which
 * matters here: the order of this list *is* the running order of the
 * player, so two different answers meant "next track" depended on which
 * page you happened to start from.
 */

export interface RawSong {
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

interface RawGroup {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
}

export const SONG_COLUMNS =
  'id, group_id, slug, title, performer, description, audio_url, cover_url, duration_seconds, lyrics';

export function toSong(r: RawSong): PublicSong {
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
 * The whole songbook, in the order it plays.
 *
 * `sort_order` then `title` — the editor's arrangement first, alphabetical
 * where they have not expressed one. This is the queue behind "play all"
 * and behind every "next track", so it must be the same sequence wherever
 * a visitor happens to press play.
 */
export async function loadSongCatalogue(): Promise<readonly PublicSong[]> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .schema('cms')
    .from('songs')
    .select(SONG_COLUMNS)
    .order('sort_order')
    .order('title');

  return ((data ?? []) as RawSong[]).map(toSong);
}

export async function loadSongGroups(): Promise<readonly PublicSongGroup[]> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .schema('cms')
    .from('song_groups')
    .select('id, name, slug, description, sort_order')
    .order('sort_order');

  return ((data ?? []) as RawGroup[]).map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    description: g.description,
  }));
}
