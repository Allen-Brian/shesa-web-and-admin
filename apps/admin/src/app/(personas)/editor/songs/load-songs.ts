import { getServerClient } from '@/lib/supabase-server';

import type { GroupRow, SongRow } from './widgets/song-widget-types';
import { loadContentMetrics, NO_METRICS } from '@/lib/content-metrics';

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
  readonly sort_order: number;
  readonly created_at: string;
  readonly updated_at: string;
}

function normaliseSong(raw: RawSong): Omit<SongRow, 'views' | 'likes'> {
  return {
    id: raw.id,
    groupId: raw.group_id,
    slug: raw.slug,
    title: raw.title,
    performer: raw.performer,
    description: raw.description,
    audioUrl: raw.audio_url,
    coverUrl: raw.cover_url,
    durationSeconds: raw.duration_seconds,
    lyrics: raw.lyrics,
    sortOrder: raw.sort_order,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export interface LoadedSongs {
  readonly songs: readonly SongRow[];
  readonly groups: readonly GroupRow[];
}

export async function loadEditorSongs(): Promise<LoadedSongs> {
  const supabase = await getServerClient();

  const [{ data: songsRaw }, { data: groupsRaw }] = await Promise.all([
    supabase
      .schema('cms')
      .from('songs')
      .select(
        'id, group_id, slug, title, performer, description, audio_url, cover_url, duration_seconds, lyrics, sort_order, created_at, updated_at',
      )
      .order('sort_order')
      .order('title'),
    supabase
      .schema('cms')
      .from('song_groups')
      .select('id, name, slug, description, sort_order')
      .order('sort_order'),
  ]);

  const metrics = await loadContentMetrics('song');
  const songs: SongRow[] = ((songsRaw ?? []) as RawSong[]).map((s) => ({
    ...normaliseSong(s),
    ...(metrics.get(s.id) ?? NO_METRICS),
  }));
  const groups: GroupRow[] = ((groupsRaw ?? []) as RawGroup[]).map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    description: g.description,
    sortOrder: g.sort_order,
  }));

  return { songs, groups };
}
