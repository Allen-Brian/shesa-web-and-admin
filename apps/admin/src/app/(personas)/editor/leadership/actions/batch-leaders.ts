'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult, BatchLeaderInput } from './leadership-action-types';

/** CRUD for `cms.batch_leaders`. RLS gates on `cms.edit`. */
export async function createBatchLeader(
  input: BatchLeaderInput,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('cms')
    .from('batch_leaders')
    .insert({
      batch: input.batch.trim(),
      name: input.name.trim(),
      photo_url: input.photoUrl?.trim() || null,
      sort_order: input.sortOrder,
    } as never)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Could not create batch leader.' };
  }
  revalidatePath('/editor/leadership');
  return { ok: true, data: data as { id: string } };
}

export async function updateBatchLeader(
  id: string,
  patch: Partial<BatchLeaderInput>,
): Promise<ActionResult> {
  const supabase = await getServerClient();
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.batch !== undefined) body.batch = patch.batch.trim();
  if (patch.name !== undefined) body.name = patch.name.trim();
  if (patch.photoUrl !== undefined) body.photo_url = patch.photoUrl?.trim() || null;
  if (patch.sortOrder !== undefined) body.sort_order = patch.sortOrder;

  const { error } = await supabase
    .schema('cms')
    .from('batch_leaders')
    .update(body as never)
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/leadership');
  return { ok: true };
}

export async function deleteBatchLeader(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('batch_leaders').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/leadership');
  return { ok: true };
}

/** Mass-delete driven by the batches table's MassActions. */
export async function deleteBatchLeaders(
  ids: readonly string[],
): Promise<ActionResult<{ count: number }>> {
  if (ids.length === 0) return { ok: true, data: { count: 0 } };
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('batch_leaders').delete().in('id', ids);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/leadership');
  return { ok: true, data: { count: ids.length } };
}
