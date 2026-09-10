'use client';

import { CalendarDays, Network } from 'lucide-react';

import { EntityLinker } from '@/components/linkers/entity-linker';

import type { LinkableEvent, LinkableOrgan } from './gallery-widget-types';

/**
 * Searchable dropdown of `cms.site_events`. Linking an album to an
 * event powers the "View album" button on the event detail page and
 * the "View event" link on the album detail page.
 */
export function EventLinker({
  events,
  value,
  onChange,
}: {
  readonly events: readonly LinkableEvent[];
  readonly value: string | null;
  readonly onChange: (nextEventId: string | null) => void;
}) {
  return (
    <EntityLinker
      title="Linked event"
      icon={CalendarDays}
      value={value}
      onChange={onChange}
      placeholder="Not linked to any event"
      searchPlaceholder="Search events…"
      emptyText="No events found."
      help="Linking an album to an event shows a “View album” button on the event page."
      options={events.map((e) => ({
        id: e.id,
        label: e.title,
        hint: `${new Date(e.startsAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })} · ${e.slug}`,
        search: e.slug,
      }))}
    />
  );
}

/**
 * The same control pointed at `cms.organs`.
 *
 * This is the album's half of the branch link. The organ's own editor
 * has the mirror of it, so the relationship can be set from whichever
 * screen the editor happens to be on — they write the same column.
 */
export function OrganLinker({
  organs,
  value,
  onChange,
}: {
  readonly organs: readonly LinkableOrgan[];
  readonly value: string | null;
  readonly onChange: (nextOrganId: string | null) => void;
}) {
  return (
    <EntityLinker
      title="Linked branch / organ"
      icon={Network}
      value={value}
      onChange={onChange}
      placeholder="Not linked to any organ"
      searchPlaceholder="Search organs…"
      emptyText="No organs found."
      help="Linking an album to an organ shows its photos on that organ’s public page."
      options={organs.map((o) => ({ id: o.id, label: o.name }))}
    />
  );
}
