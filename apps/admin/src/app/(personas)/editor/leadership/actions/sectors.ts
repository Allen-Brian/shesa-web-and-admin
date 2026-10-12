'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult, SectorInput } from './leadership-action-types';

/**
 * CRUD server actions for `cms.mainstream_sectors`. Writes run under
 * the caller's JWT; the schema's RLS policy gates on `cms.edit` at
 * Mainstream, so only editors + mainstream admins pass through.
 */
export async function createSector(input: SectorInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('cms')
    .from('mainstream_sectors')
    .insert({
      name: input.name.trim(),
      caption: input.caption?.trim() || null,
      sort_order: input.sortOrder,
    } as never)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Could not create sector.' };
  }
  revalidatePath('/editor/leadership');
  return { ok: true, data: data as { id: string } };
}

export async function updateSector(id: string, patch: Partial<SectorInput>): Promise<ActionResult> {
  const supabase = await getServerClient();
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) body.name = patch.name.trim();
  if (patch.caption !== undefined) body.caption = patch.caption?.trim() || null;
  if (patch.sortOrder !== undefined) body.sort_order = patch.sortOrder;

  const { error } = await supabase
    .schema('cms')
    .from('mainstream_sectors')
    .update(body as never)
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/leadership');
  return { ok: true };
}

export async function deleteSector(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('mainstream_sectors').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/leadership');
  return { ok: true };
}

/** Mass-delete used by the sectors manager's row-selection UI. */
export async function deleteSectors(
  ids: readonly string[],
): Promise<ActionResult<{ count: number }>> {
  if (ids.length === 0) return { ok: true, data: { count: 0 } };
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('mainstream_sectors').delete().in('id', ids);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/leadership');
  return { ok: true, data: { count: ids.length } };
}
