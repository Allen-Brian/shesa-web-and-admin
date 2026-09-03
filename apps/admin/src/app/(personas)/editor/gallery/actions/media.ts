'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult, MediaInput } from './gallery-action-types';

/**
 * CRUD for `cms.gallery_media`. Media items are children of an album
 * and CASCADE-delete with their parent; this file only has to worry
 * about add / update / remove of individual rows.
 */
export async function createMediaItem(input: MediaInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('cms')
    .from('gallery_media')
    .insert({
      album_id: input.albumId,
      kind: input.kind,
      src: input.src,
      thumbnail_url: input.thumbnailUrl ?? null,
      poster_url: input.posterUrl ?? null,
      alt: input.alt ?? null,
      aspect: input.aspect,
      sort_order: input.sortOrder,
    } as never)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Could not add media.' };
  }
  revalidatePath(`/editor/gallery/${input.albumId}/edit`);
  revalidatePath('/gallery');
  return { ok: true, data: data as { id: string } };
}

export async function updateMediaItem(
  id: string,
  patch: Partial<MediaInput>,
): Promise<ActionResult> {
  const supabase = await getServerClient();
  const body: Record<string, unknown> = {};
  if (patch.kind !== undefined) body.kind = patch.kind;
  if (patch.src !== undefined) body.src = patch.src;
  if (patch.thumbnailUrl !== undefined) body.thumbnail_url = patch.thumbnailUrl ?? null;
  if (patch.posterUrl !== undefined) body.poster_url = patch.posterUrl ?? null;
  if (patch.alt !== undefined) body.alt = patch.alt ?? null;
  if (patch.aspect !== undefined) body.aspect = patch.aspect;
  if (patch.sortOrder !== undefined) body.sort_order = patch.sortOrder;

  const { error } = await supabase
    .schema('cms')
    .from('gallery_media')
    .update(body as never)
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/gallery');
  revalidatePath('/gallery');
  return { ok: true };
}

export async function deleteMediaItem(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('gallery_media').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/gallery');
  revalidatePath('/gallery');
  return { ok: true };
}

/**
 * Bulk reorder for the media grid — the editor drags an item around
 * and we save the new sort_order values in one round trip.
 */
export async function reorderMedia(
  updates: readonly { readonly id: string; readonly sortOrder: number }[],
): Promise<ActionResult<{ count: number }>> {
  if (updates.length === 0) return { ok: true, data: { count: 0 } };
  const supabase = await getServerClient();
  for (const u of updates) {
    const { error } = await supabase
      .schema('cms')
      .from('gallery_media')
      .update({ sort_order: u.sortOrder } as never)
      .eq('id', u.id);
    if (error) return { ok: false, message: error.message };
  }
  revalidatePath('/editor/gallery');
  revalidatePath('/gallery');
  return { ok: true, data: { count: updates.length } };
}
