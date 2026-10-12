import { Target } from 'lucide-react';

import { loadEditorProjects } from './load-projects';
import { ProjectsListView } from './widgets/projects-list-view';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Projects' };

/** Projects list page for the Editor persona. */
export default async function EditorProjectsPage() {
  const { projects, categories } = await loadEditorProjects();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Content
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Target className="h-6 w-6" />
          Projects
        </h1>
        <p className="text-sm text-muted-foreground">
          Every project shown on the public Projects page. Fundraising trio drives the progress bar;
          featured entries prioritise on the list.
        </p>
      </header>

      <ProjectsListView projects={projects} categories={categories} />
    </section>
  );
}
