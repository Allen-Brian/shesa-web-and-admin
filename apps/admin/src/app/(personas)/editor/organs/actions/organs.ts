'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult, OrganInput } from './types';

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
    sort_order: input.sortOrder,
  };
}

export async function createOrgan(input: OrganInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('cms' as never)
    .from('organs' as never)
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
    .schema('cms' as never)
    .from('organs' as never)
    .update(body as never)
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/organs');
  revalidatePath(`/editor/organs/${id}/edit`);
  revalidatePath('/organs');
  return { ok: true };
}

export async function deleteOrgan(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase
    .schema('cms' as never)
    .from('organs' as never)
    .delete()
    .eq('id', id);
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
  const { error } = await supabase
    .schema('cms' as never)
    .from('organs' as never)
    .delete()
    .in('id', ids);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/organs');
  revalidatePath('/organs');
  return { ok: true, data: { count: ids.length } };
}
