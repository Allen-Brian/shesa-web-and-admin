'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult, ProjectInput } from './project-action-types';

/**
 * CRUD for `cms.projects`. Categories are managed as a table
 * replacement (delete + insert). Fundraising trio must arrive as
 * all-three-or-nothing — if any is set we treat the whole set as
 * meaningful; otherwise all three land as NULL.
 */

async function replaceCategoryMap(
  supabase: Awaited<ReturnType<typeof getServerClient>>,
  projectId: string,
  categoryIds: readonly string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: delErr } = await supabase
    .schema('cms')
    .from('project_categories_map')
    .delete()
    .eq('project_id', projectId);
  if (delErr) return { ok: false, message: delErr.message };
  if (categoryIds.length === 0) return { ok: true };
  const rows = categoryIds.map((c) => ({ project_id: projectId, category_id: c }));
  const { error: insErr } = await supabase
    .schema('cms')
    .from('project_categories_map')
    .insert(rows as never);
  if (insErr) return { ok: false, message: insErr.message };
  return { ok: true };
}

function toDbBody(input: ProjectInput) {
  const hasFunding =
    input.fundingRaised != null || input.fundingTarget != null || input.fundingCurrency;
  return {
    slug: input.slug.trim(),
    title: input.title.trim(),
    short_description: input.shortDescription?.trim() || null,
    description_html: input.descriptionHtml,
    banner_url: input.bannerUrl?.trim() || null,
    status: input.status,
    started_on: input.startedOn?.trim() || null,
    location: input.location?.trim() || null,
    lead: input.lead?.trim() || null,
    is_featured: input.isFeatured,
    funding_raised: hasFunding ? (input.fundingRaised ?? 0) : null,
    funding_target: hasFunding ? (input.fundingTarget ?? 0) : null,
    funding_currency: hasFunding ? input.fundingCurrency?.trim() || 'XAF' : null,
    milestones: input.milestones,
    impact_stats: input.impactStats,
  };
}

export async function createProject(input: ProjectInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('cms')
    .from('projects')
    .insert(toDbBody(input) as never)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Could not create project.' };
  }
  const projectId = (data as { id: string }).id;
  const mapRes = await replaceCategoryMap(supabase, projectId, input.categoryIds);
  if (!mapRes.ok) return { ok: false, message: mapRes.message };
  revalidatePath('/editor/projects');
  revalidatePath('/projects');
  return { ok: true, data: { id: projectId } };
}

export async function updateProject(id: string, input: ProjectInput): Promise<ActionResult> {
  const supabase = await getServerClient();
  const body = { ...toDbBody(input), updated_at: new Date().toISOString() };
  const { error } = await supabase
    .schema('cms')
    .from('projects')
    .update(body as never)
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  const mapRes = await replaceCategoryMap(supabase, id, input.categoryIds);
  if (!mapRes.ok) return { ok: false, message: mapRes.message };
  revalidatePath('/editor/projects');
  revalidatePath(`/editor/projects/${id}/edit`);
  revalidatePath('/projects');
  revalidatePath(`/projects/${input.slug}`);
  return { ok: true };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('projects').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/projects');
  revalidatePath('/projects');
  return { ok: true };
}

/** Mass-delete driven by the projects table's MassActions. */
export async function deleteProjects(
  ids: readonly string[],
): Promise<ActionResult<{ count: number }>> {
  if (ids.length === 0) return { ok: true, data: { count: 0 } };
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('projects').delete().in('id', ids);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/projects');
  revalidatePath('/projects');
  return { ok: true, data: { count: ids.length } };
}
