import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import type { Project } from '@/components/projects/data';
import { formatProject, type RawProject } from '@/components/projects/format-project';
import { ProjectDetail } from '@/components/projects/project-detail';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface Params {
  readonly slug: string;
}

interface RawCategory {
  readonly id: string;
  readonly name: string;
}
interface RawMap {
  readonly project_id: string;
  readonly category_id: string;
}

/**
 * Fetch every project + join through categories in one round-trip.
 * Used by both metadata generation and the page renderer — the
 * per-request cost is small (10-50 rows), and returning the full set
 * lets us compute related projects locally.
 */
async function loadAllProjects(): Promise<readonly Project[]> {
  const supabase = await getServerClient();

  const [{ data: projectsRaw }, { data: categoriesRaw }, { data: mapRaw }] = await Promise.all([
    supabase
      .schema('cms' as never)
      .from('projects' as never)
      .select(
        'id, slug, title, short_description, description_html, banner_url, status, started_on, location, lead, is_featured, funding_raised, funding_target, funding_currency, milestones, impact_stats',
      )
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .schema('cms' as never)
      .from('project_categories' as never)
      .select('id, name'),
    supabase
      .schema('cms' as never)
      .from('project_categories_map' as never)
      .select('project_id, category_id'),
  ]);

  const catNameById = new Map(((categoriesRaw ?? []) as RawCategory[]).map((c) => [c.id, c.name]));
  const catsByProject = new Map<string, string[]>();
  for (const m of (mapRaw ?? []) as RawMap[]) {
    const name = catNameById.get(m.category_id);
    if (!name) continue;
    const bucket = catsByProject.get(m.project_id) ?? [];
    bucket.push(name);
    catsByProject.set(m.project_id, bucket);
  }

  return ((projectsRaw ?? []) as RawProject[]).map((r) =>
    formatProject(r, catsByProject.get(r.id) ?? []),
  );
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const list = await loadAllProjects();
  const project = list.find((p) => p.slug === slug);
  if (!project) return { title: 'Project · SHESA' };
  return {
    title: `${project.title} · SHESA Projects`,
    description: project.shortDescription,
  };
}

export default async function ProjectPage({ params }: { readonly params: Promise<Params> }) {
  const { slug } = await params;
  const list = await loadAllProjects();
  const project = list.find((p) => p.slug === slug);
  if (!project) notFound();

  const related = list
    .filter((p) => p.id !== project.id && p.category === project.category)
    .slice(0, 3);

  return <ProjectDetail project={project} related={related} />;
}
