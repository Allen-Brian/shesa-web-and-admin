'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult, SongInput } from './song-action-types';

function toDbBody(input: SongInput) {
  return {
    group_id: input.groupId,
    slug: input.slug.trim(),
    title: input.title.trim(),
    performer: input.performer?.trim() || null,
    description: input.description?.trim() || null,
    audio_url: input.audioUrl.trim(),
    cover_url: input.coverUrl?.trim() || null,
    duration_seconds: input.durationSeconds ?? null,
    lyrics: input.lyrics?.trim() || null,
    sort_order: input.sortOrder,
  };
}

export async function createSong(input: SongInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('cms')
    .from('songs')
    .insert(toDbBody(input) as never)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Could not create song.' };
  }
  revalidatePath('/editor/songs');
  revalidatePath('/songs');
  return { ok: true, data: data as { id: string } };
}

export async function updateSong(id: string, input: SongInput): Promise<ActionResult> {
  const supabase = await getServerClient();
  const body = { ...toDbBody(input), updated_at: new Date().toISOString() };
  const { error } = await supabase
    .schema('cms')
    .from('songs')
    .update(body as never)
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/songs');
  revalidatePath(`/editor/songs/${id}/edit`);
  revalidatePath('/songs');
  return { ok: true };
}

export async function deleteSong(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('songs').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/songs');
  revalidatePath('/songs');
  return { ok: true };
}

export async function deleteSongs(
  ids: readonly string[],
): Promise<ActionResult<{ count: number }>> {
  if (ids.length === 0) return { ok: true, data: { count: 0 } };
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('songs').delete().in('id', ids);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/songs');
  revalidatePath('/songs');
  return { ok: true, data: { count: ids.length } };
}
