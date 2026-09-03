import Link from 'next/link';
import { ArrowLeft, Target } from 'lucide-react';

import { loadEditorProjects } from '../load-projects';
import { ProjectForm } from '../widgets/project-form';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — New project' };

/** Create-project page for the Editor persona. */
export default async function NewProjectPage() {
  const { categories } = await loadEditorProjects();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Link
          href="/editor/projects"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Projects
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Target className="h-6 w-6" />
          New project
        </h1>
      </div>

      <ProjectForm categories={categories} />
    </section>
  );
}
