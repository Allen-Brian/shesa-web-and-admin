import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Target } from 'lucide-react';

import { loadEditorProjects } from '../../load-projects';
import { ProjectForm } from '../../widgets/project-form';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Edit project' };

interface Params {
  readonly params: Promise<{ id: string }>;
}

/** Edit-project page for the Editor persona. */
export default async function EditProjectPage({ params }: Params) {
  const { id } = await params;
  const { projects, categories } = await loadEditorProjects();
  const project = projects.find((p) => p.id === id);
  if (!project) notFound();

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
          Edit project
        </h1>
        <p className="text-xs text-muted-foreground">{project.title}</p>
      </div>

      <ProjectForm categories={categories} editing={project} />
    </section>
  );
}
