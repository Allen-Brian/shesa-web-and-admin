'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult, OrganInput } from './organ-action-types';

function toDbBody(input: OrganInput) {
  return {
    sector_id: input.sectorId,
    slug: input.slug.trim(),
    name: input.name.trim(),
    short_name: input.shortName?.trim() || null,
    location: input.location?.trim() || null,
    country: input.country?.trim() || null,
    founded_year: input.foundedYear ?? null,
    member_count: Math.max(0, Math.floor(input.memberCount)),
    description: input.description?.trim() || null,
    logo_url: input.logoUrl?.trim() || null,
    contact_email: input.contactEmail?.trim() || null,
    contact_phone: input.contactPhone?.trim() || null,
    website_url: input.websiteUrl?.trim() || null,
    // Blanks dropped here rather than in the form: the editor keeps three
    // boxes on screen whether or not they are filled, and empty strings
    // would render as empty numbered cards on the public page.
    achievements: (input.achievements ?? []).map((a) => a.trim()).filter(Boolean),
    sort_order: input.sortOrder,
  };
}

export async function createOrgan(input: OrganInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('cms')
    .from('organs')
    .insert(toDbBody(input) as never)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Could not create organ.' };
  }
  revalidatePath('/editor/organs');
  revalidatePath('/organs');
  return { ok: true, data: data as { id: string } };
}

export async function updateOrgan(id: string, input: OrganInput): Promise<ActionResult> {
  const supabase = await getServerClient();
  const body = { ...toDbBody(input), updated_at: new Date().toISOString() };
  const { error } = await supabase
    .schema('cms')
    .from('organs')
    .update(body as never)
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/organs');
  revalidatePath(`/editor/organs/${id}/edit`);
  revalidatePath('/organs');
  // The organ's own page, which renders the achievements just edited.
  revalidatePath(`/organs/${input.slug}`);
  return { ok: true };
}

export async function deleteOrgan(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('organs').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/organs');
  revalidatePath('/organs');
  return { ok: true };
}

export async function deleteOrgans(
  ids: readonly string[],
): Promise<ActionResult<{ count: number }>> {
  if (ids.length === 0) return { ok: true, data: { count: 0 } };
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('organs').delete().in('id', ids);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/organs');
  revalidatePath('/organs');
  return { ok: true, data: { count: ids.length } };
}

/**
 * Point an album at this organ — the mirror of the picker on the album
 * form, so the relationship can be set from either screen.
 *
 * Two writes, in this order. `gallery_albums.linked_organ_id` lives on
 * the album, so "this organ's album" is really "the album pointing here";
 * moving the link therefore means clearing whatever pointed here before,
 * or the organ's page would keep finding the old one. Clearing first also
 * means the failure mode is an organ with no album rather than an organ
 * with two, which is the one a reader would notice.
 *
 * Passing null unlinks and stops there.
 */
export async function setOrganAlbum(
  organId: string,
  albumId: string | null,
): Promise<ActionResult> {
  const supabase = await getServerClient();

  const { error: clearError } = await supabase
    .schema('cms')
    .from('gallery_albums')
    .update({ linked_organ_id: null } as never)
    .eq('linked_organ_id', organId);
  if (clearError) return { ok: false, message: clearError.message };

  if (albumId) {
    const { error } = await supabase
      .schema('cms')
      .from('gallery_albums')
      .update({ linked_organ_id: organId } as never)
      .eq('id', albumId);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath('/editor/organs');
  revalidatePath('/editor/gallery');
  revalidatePath('/organs');
  return { ok: true };
}
