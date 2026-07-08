import type { Metadata } from 'next';

import { ProjectsHero } from '@/components/projects/projects-hero';
import { ProjectsList } from '@/components/projects/projects-list';

export const metadata: Metadata = {
  title: 'Projects · SHESA',
  description: 'The projects, funds, and community missions SHESA is quietly building.',
};

export default function ProjectsPage() {
  return (
    <>
      <ProjectsHero />
      <ProjectsList />
    </>
  );
}
