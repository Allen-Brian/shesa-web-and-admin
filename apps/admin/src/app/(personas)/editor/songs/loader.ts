import { getServerClient } from '@/lib/supabase-server';

import type { GroupRow, SongRow } from './widgets/types';

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

function normaliseSong(raw: RawSong): SongRow {
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
      .schema('cms' as never)
      .from('songs' as never)
      .select(
        'id, group_id, slug, title, performer, description, audio_url, cover_url, duration_seconds, lyrics, sort_order, created_at, updated_at',
      )
      .order('sort_order')
      .order('title'),
    supabase
      .schema('cms' as never)
      .from('song_groups' as never)
      .select('id, name, slug, description, sort_order')
      .order('sort_order'),
  ]);

  const songs: SongRow[] = ((songsRaw ?? []) as RawSong[]).map(normaliseSong);
  const groups: GroupRow[] = ((groupsRaw ?? []) as RawGroup[]).map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    description: g.description,
    sortOrder: g.sort_order,
  }));

  return { songs, groups };
}
