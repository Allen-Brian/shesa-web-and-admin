'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult, AlbumInput } from './gallery-action-types';

async function replaceCategoryMap(
  supabase: Awaited<ReturnType<typeof getServerClient>>,
  albumId: string,
  categoryIds: readonly string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: delErr } = await supabase
    .schema('cms')
    .from('gallery_album_categories_map')
    .delete()
    .eq('album_id', albumId);
  if (delErr) return { ok: false, message: delErr.message };
  if (categoryIds.length === 0) return { ok: true };
  const rows = categoryIds.map((c) => ({ album_id: albumId, category_id: c }));
  const { error: insErr } = await supabase
    .schema('cms')
    .from('gallery_album_categories_map')
    .insert(rows as never);
  if (insErr) return { ok: false, message: insErr.message };
  return { ok: true };
}

function toDbBody(input: AlbumInput) {
  return {
    slug: input.slug.trim(),
    title: input.title.trim(),
    date_label: input.dateLabel?.trim() || null,
    location: input.location?.trim() || null,
    description: input.description?.trim() || null,
    cover_url: input.coverUrl?.trim() || null,
    photographer: input.photographer?.trim() || null,
    linked_event_id: input.linkedEventId ?? null,
    linked_organ_id: input.linkedOrganId ?? null,
    sort_order: input.sortOrder,
  };
}

export async function createAlbum(input: AlbumInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('cms')
    .from('gallery_albums')
    .insert(toDbBody(input) as never)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Could not create album.' };
  }
  const albumId = (data as { id: string }).id;
  const mapRes = await replaceCategoryMap(supabase, albumId, input.categoryIds);
  if (!mapRes.ok) return { ok: false, message: mapRes.message };
  revalidatePath('/editor/gallery');
  revalidatePath('/gallery');
  return { ok: true, data: { id: albumId } };
}

export async function updateAlbum(id: string, input: AlbumInput): Promise<ActionResult> {
  const supabase = await getServerClient();
  const body = { ...toDbBody(input), updated_at: new Date().toISOString() };
  const { error } = await supabase
    .schema('cms')
    .from('gallery_albums')
    .update(body as never)
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  const mapRes = await replaceCategoryMap(supabase, id, input.categoryIds);
  if (!mapRes.ok) return { ok: false, message: mapRes.message };
  revalidatePath('/editor/gallery');
  revalidatePath(`/editor/gallery/${id}/edit`);
  revalidatePath('/gallery');
  revalidatePath(`/gallery/${input.slug}`);
  return { ok: true };
}

export async function deleteAlbum(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('gallery_albums').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/gallery');
  revalidatePath('/gallery');
  return { ok: true };
}

/** Mass-delete driven by the albums table's MassActions. */
export async function deleteAlbums(
  ids: readonly string[],
): Promise<ActionResult<{ count: number }>> {
  if (ids.length === 0) return { ok: true, data: { count: 0 } };
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('gallery_albums').delete().in('id', ids);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/gallery');
  revalidatePath('/gallery');
  return { ok: true, data: { count: ids.length } };
}
