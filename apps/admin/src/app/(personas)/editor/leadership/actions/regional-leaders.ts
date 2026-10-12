'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult, RegionalLeaderInput } from './leadership-action-types';

/**
 * Shared CRUD for `cms.branch_leaders` + `cms.diaspora_leaders` — the
 * two tables share the exact same shape so the helpers take a table
 * name argument instead of duplicating the whole file.
 */
type RegionalTable = 'branch_leaders' | 'diaspora_leaders';

async function upsertOne(
  table: RegionalTable,
  input: RegionalLeaderInput,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('cms')
    .from(table as never)
    .insert({
      branch_name: input.branchName.trim(),
      name: input.name.trim(),
      region: input.region?.trim() || null,
      photo_url: input.photoUrl?.trim() || null,
      role: input.role ?? 'president',
      profession: input.profession?.trim() || null,
      bio: input.bio?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      organ_id: input.organId || null,
      sort_order: input.sortOrder,
    } as never)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    // 23505 is branch_role_key: one president and one vice president per
    // branch. Say which, rather than surfacing the index name.
    if (error?.code === '23505') {
      return {
        ok: false,
        message: `${input.branchName.trim()} already has a ${
          (input.role ?? 'president') === 'president' ? 'president' : 'vice president'
        }. Edit the existing one instead.`,
      };
    }
    return { ok: false, message: error?.message ?? 'Could not create leader.' };
  }
  revalidatePath('/editor/leadership');
  return { ok: true, data: data as { id: string } };
}

async function updateOne(
  table: RegionalTable,
  id: string,
  patch: Partial<RegionalLeaderInput>,
): Promise<ActionResult> {
  const supabase = await getServerClient();
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.branchName !== undefined) body.branch_name = patch.branchName.trim();
  if (patch.name !== undefined) body.name = patch.name.trim();
  if (patch.region !== undefined) body.region = patch.region?.trim() || null;
  if (patch.photoUrl !== undefined) body.photo_url = patch.photoUrl?.trim() || null;
  if (patch.role !== undefined) body.role = patch.role;
  if (patch.profession !== undefined) body.profession = patch.profession?.trim() || null;
  if (patch.bio !== undefined) body.bio = patch.bio?.trim() || null;
  if (patch.email !== undefined) body.email = patch.email?.trim() || null;
  if (patch.phone !== undefined) body.phone = patch.phone?.trim() || null;
  if (patch.organId !== undefined) body.organ_id = patch.organId || null;
  if (patch.sortOrder !== undefined) body.sort_order = patch.sortOrder;

  const { error } = await supabase
    .schema('cms')
    .from(table as never)
    .update(body as never)
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/leadership');
  return { ok: true };
}

async function deleteOne(table: RegionalTable, id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase
    .schema('cms')
    .from(table as never)
    .delete()
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/leadership');
  return { ok: true };
}

async function deleteMany(
  table: RegionalTable,
  ids: readonly string[],
): Promise<ActionResult<{ count: number }>> {
  if (ids.length === 0) return { ok: true, data: { count: 0 } };
  const supabase = await getServerClient();
  const { error } = await supabase
    .schema('cms')
    .from(table as never)
    .delete()
    .in('id', ids);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/leadership');
  return { ok: true, data: { count: ids.length } };
}

// ─── Branch ─────────────────────────────────────────────────────────
// 'use server' requires exported symbols to be async functions —
// arrow-const forms aren't accepted. Each thin wrapper below just
// delegates to the shared helpers with the table name pinned.

export async function createBranchLeader(input: RegionalLeaderInput) {
  return upsertOne('branch_leaders', input);
}
export async function updateBranchLeader(id: string, patch: Partial<RegionalLeaderInput>) {
  return updateOne('branch_leaders', id, patch);
}
export async function deleteBranchLeader(id: string) {
  return deleteOne('branch_leaders', id);
}
export async function deleteBranchLeaders(ids: readonly string[]) {
  return deleteMany('branch_leaders', ids);
}

// ─── Diaspora ───────────────────────────────────────────────────────

export async function createDiasporaLeader(input: RegionalLeaderInput) {
  return upsertOne('diaspora_leaders', input);
}
export async function updateDiasporaLeader(id: string, patch: Partial<RegionalLeaderInput>) {
  return updateOne('diaspora_leaders', id, patch);
}
export async function deleteDiasporaLeader(id: string) {
  return deleteOne('diaspora_leaders', id);
}
export async function deleteDiasporaLeaders(ids: readonly string[]) {
  return deleteMany('diaspora_leaders', ids);
}
