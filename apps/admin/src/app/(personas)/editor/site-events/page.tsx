import { CalendarDays } from 'lucide-react';

import { loadEditorSiteEvents } from './load-site-events';
import { SiteEventsListView } from './widgets/site-events-list-view';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Site Events' };

/** Site Events list page for the Editor persona. */
export default async function EditorSiteEventsPage() {
  const { events, categories } = await loadEditorSiteEvents();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Content
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <CalendarDays className="h-6 w-6" />
          Site Events
        </h1>
        <p className="text-sm text-muted-foreground">
          Every event shown on the public Events page. Only one event can be featured at a time
          (surfaces as the hero); ticketed events pick up a Get Tickets button on their detail page.
        </p>
      </header>

      <SiteEventsListView events={events} categories={categories} />
    </section>
  );
}
