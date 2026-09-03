import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CalendarDays } from 'lucide-react';

import { loadEditorSiteEvents } from '../../load-site-events';
import { SiteEventForm } from '../../widgets/site-event-form';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Edit site event' };

interface Params {
  readonly params: Promise<{ id: string }>;
}

/** Edit-event page for the Editor persona. */
export default async function EditSiteEventPage({ params }: Params) {
  const { id } = await params;
  const { events, categories } = await loadEditorSiteEvents();
  const event = events.find((e) => e.id === id);
  if (!event) notFound();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Link
          href="/editor/site-events"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Site Events
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <CalendarDays className="h-6 w-6" />
          Edit event
        </h1>
        <p className="text-xs text-muted-foreground">{event.title}</p>
      </div>

      <SiteEventForm categories={categories} editing={event} />
    </section>
  );
}
