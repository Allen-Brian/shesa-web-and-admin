import type { Metadata } from 'next';

import { PartnersTicker } from '@/components/home/partners-ticker';
import type { Project } from '@/components/projects/projects-content';
import { formatProject, type RawProject } from '@/components/projects/format-project';
import { ProjectsHero } from '@/components/projects/projects-hero';
import { ProjectsList } from '@/components/projects/projects-list';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'The projects, funds, and community missions SHESA is quietly building.',
  alternates: { canonical: '/projects' },
  openGraph: {
    title: 'Projects',
    description: 'The projects, funds, and community missions SHESA is quietly building.',
    url: '/projects',
    type: 'website',
  },
};

interface RawCategory {
  readonly id: string;
  readonly name: string;
}
interface RawMap {
  readonly project_id: string;
  readonly category_id: string;
}

/**
 * Public Projects landing. Reads every `cms.projects` row + the
 * category map server-side, formats each into the public `Project`
 * shape, then hands both the hero (for its status headcount) and the
 * filter/list the same array.
 */
export default async function ProjectsPage() {
  const supabase = await getServerClient();

  const [{ data: projectsRaw }, { data: categoriesRaw }, { data: mapRaw }] = await Promise.all([
    supabase
      .schema('cms')
      .from('projects')
      .select(
        'id, slug, title, short_description, description_html, banner_url, status, started_on, location, lead, is_featured, funding_raised, funding_target, funding_currency, milestones, impact_stats',
      )
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.schema('cms').from('project_categories').select('id, name'),
    supabase.schema('cms').from('project_categories_map').select('project_id, category_id'),
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

  const projects: Project[] = ((projectsRaw ?? []) as RawProject[]).map((r) =>
    formatProject(r, catsByProject.get(r.id) ?? []),
  );

  const categories = Array.from(catNameById.values()).sort();

  return (
    <>
      <ProjectsHero projects={projects} />
      <ProjectsList projects={projects} categories={categories} />
      {/* Partner boards always sit last, immediately above the footer. */}
      <PartnersTicker />
    </>
  );
}
