'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult, CategoryInput } from './project-action-types';

/** CRUD for `cms.project_categories`. RLS gates on `cms.edit`. */
export async function createProjectCategory(
  input: CategoryInput,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('cms')
    .from('project_categories')
    .insert({ name: input.name.trim(), sort_order: input.sortOrder } as never)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Could not create category.' };
  }
  revalidatePath('/editor/projects');
  return { ok: true, data: data as { id: string } };
}

export async function updateProjectCategory(
  id: string,
  patch: Partial<CategoryInput>,
): Promise<ActionResult> {
  const supabase = await getServerClient();
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) body.name = patch.name.trim();
  if (patch.sortOrder !== undefined) body.sort_order = patch.sortOrder;

  const { error } = await supabase
    .schema('cms')
    .from('project_categories')
    .update(body as never)
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/projects');
  return { ok: true };
}

export async function deleteProjectCategory(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('project_categories').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/projects');
  return { ok: true };
}
