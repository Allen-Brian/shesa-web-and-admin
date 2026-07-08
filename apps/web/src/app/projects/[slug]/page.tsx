import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ProjectDetail } from '@/components/projects/project-detail';
import { findProject, projects } from '@/components/projects/data';

interface Params {
  readonly slug: string;
}

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = findProject(slug);
  if (!project) return { title: 'Project · SHESA' };
  return {
    title: `${project.title} · SHESA Projects`,
    description: project.shortDescription,
  };
}

export default async function ProjectPage({ params }: { readonly params: Promise<Params> }) {
  const { slug } = await params;
  const project = findProject(slug);
  if (!project) notFound();
  return <ProjectDetail project={project} />;
}
