'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult, GroupInput } from './song-action-types';

export async function createSongGroup(input: GroupInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('cms')
    .from('song_groups')
    .insert({
      name: input.name.trim(),
      slug: input.slug.trim(),
      description: input.description?.trim() || null,
      sort_order: input.sortOrder,
    } as never)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Could not create group.' };
  }
  revalidatePath('/editor/songs');
  revalidatePath('/songs');
  return { ok: true, data: data as { id: string } };
}

export async function updateSongGroup(
  id: string,
  patch: Partial<GroupInput>,
): Promise<ActionResult> {
  const supabase = await getServerClient();
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) body.name = patch.name.trim();
  if (patch.slug !== undefined) body.slug = patch.slug.trim();
  if (patch.description !== undefined) body.description = patch.description?.trim() || null;
  if (patch.sortOrder !== undefined) body.sort_order = patch.sortOrder;

  const { error } = await supabase
    .schema('cms')
    .from('song_groups')
    .update(body as never)
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/songs');
  revalidatePath('/songs');
  return { ok: true };
}

export async function deleteSongGroup(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('song_groups').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/songs');
  revalidatePath('/songs');
  return { ok: true };
}
