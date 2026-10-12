'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult, SectorInput } from './organ-action-types';

/** CRUD for `cms.organ_sectors`. RLS gates on `cms.edit`. */
export async function createOrganSector(input: SectorInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('cms')
    .from('organ_sectors')
    .insert({
      name: input.name.trim(),
      slug: input.slug.trim(),
      description: input.description?.trim() || null,
      sort_order: input.sortOrder,
    } as never)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Could not create sector.' };
  }
  revalidatePath('/editor/organs');
  revalidatePath('/organs');
  return { ok: true, data: data as { id: string } };
}

export async function updateOrganSector(
  id: string,
  patch: Partial<SectorInput>,
): Promise<ActionResult> {
  const supabase = await getServerClient();
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) body.name = patch.name.trim();
  if (patch.slug !== undefined) body.slug = patch.slug.trim();
  if (patch.description !== undefined) body.description = patch.description?.trim() || null;
  if (patch.sortOrder !== undefined) body.sort_order = patch.sortOrder;

  const { error } = await supabase
    .schema('cms')
    .from('organ_sectors')
    .update(body as never)
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/organs');
  revalidatePath('/organs');
  return { ok: true };
}

export async function deleteOrganSector(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('organ_sectors').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/organs');
  revalidatePath('/organs');
  return { ok: true };
}
