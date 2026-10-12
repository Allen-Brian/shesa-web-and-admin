import { getServerClient } from '@/lib/supabase-server';

import type {
  CategoryRow,
  ImpactStat,
  Milestone,
  ProjectRow,
  ProjectStatus,
} from './widgets/project-widget-types';

interface RawProject {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly short_description: string | null;
  readonly description_html: string;
  readonly banner_url: string | null;
  readonly status: ProjectStatus;
  readonly started_on: string | null;
  readonly location: string | null;
  readonly lead: string | null;
  readonly is_featured: boolean;
  readonly funding_raised: string | number | null;
  readonly funding_target: string | number | null;
  readonly funding_currency: string | null;
  readonly milestones: unknown;
  readonly impact_stats: unknown;
  readonly created_at: string;
  readonly updated_at: string;
}

interface RawCategory {
  readonly id: string;
  readonly name: string;
  readonly sort_order: number;
}

interface RawMap {
  readonly project_id: string;
  readonly category_id: string;
}

function toNum(v: string | number | null): number | null {
  if (v == null) return null;
  const n = typeof v === 'string' ? Number.parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

function toMilestones(v: unknown): Milestone[] {
  if (!Array.isArray(v)) return [];
  return v.map((m) => {
    const row = m as Partial<Milestone>;
    return {
      date: String(row.date ?? ''),
      title: String(row.title ?? ''),
      body: row.body ? String(row.body) : undefined,
      done: row.done === true,
    };
  });
}

function toImpactStats(v: unknown): ImpactStat[] {
  if (!Array.isArray(v)) return [];
  return v.map((s) => {
    const row = s as Partial<ImpactStat>;
    return { value: String(row.value ?? ''), label: String(row.label ?? '') };
  });
}

function normalise(raw: RawProject, categoryIds: readonly string[]): ProjectRow {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    shortDescription: raw.short_description,
    descriptionHtml: raw.description_html,
    bannerUrl: raw.banner_url,
    status: raw.status,
    startedOn: raw.started_on,
    location: raw.location,
    lead: raw.lead,
    isFeatured: raw.is_featured,
    fundingRaised: toNum(raw.funding_raised),
    fundingTarget: toNum(raw.funding_target),
    fundingCurrency: raw.funding_currency,
    milestones: toMilestones(raw.milestones),
    impactStats: toImpactStats(raw.impact_stats),
    categoryIds,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export interface LoadedProjects {
  readonly projects: readonly ProjectRow[];
  readonly categories: readonly CategoryRow[];
}

/** Server-side loader for the editor Projects surface. */
export async function loadEditorProjects(): Promise<LoadedProjects> {
  const supabase = await getServerClient();

  const [{ data: projectsRaw }, { data: categoriesRaw }, { data: mapRaw }] = await Promise.all([
    supabase
      .schema('cms')
      .from('projects')
      .select(
        'id, slug, title, short_description, description_html, banner_url, status, started_on, location, lead, is_featured, funding_raised, funding_target, funding_currency, milestones, impact_stats, created_at, updated_at',
      )
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .schema('cms')
      .from('project_categories')
      .select('id, name, sort_order')
      .order('sort_order'),
    supabase.schema('cms').from('project_categories_map').select('project_id, category_id'),
  ]);

  const catsByProject = new Map<string, string[]>();
  for (const m of (mapRaw ?? []) as RawMap[]) {
    const bucket = catsByProject.get(m.project_id) ?? [];
    bucket.push(m.category_id);
    catsByProject.set(m.project_id, bucket);
  }

  const projects: ProjectRow[] = ((projectsRaw ?? []) as RawProject[]).map((p) =>
    normalise(p, catsByProject.get(p.id) ?? []),
  );

  const categories: CategoryRow[] = ((categoriesRaw ?? []) as RawCategory[]).map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sort_order,
  }));

  return { projects, categories };
}
