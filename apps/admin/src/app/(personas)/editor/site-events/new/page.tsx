import Link from 'next/link';
import { ArrowLeft, CalendarDays } from 'lucide-react';

import { loadEditorSiteEvents } from '../load-site-events';
import { SiteEventForm } from '../widgets/site-event-form';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — New site event' };

/** Create-event page for the Editor persona. */
export default async function NewSiteEventPage() {
  const { categories } = await loadEditorSiteEvents();

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
          New event
        </h1>
      </div>

      <SiteEventForm categories={categories} />
    </section>
  );
}
