import type { Metadata } from 'next';

import { EventsHero } from '@/components/events/events-hero';
import { EventsList } from '@/components/events/events-list';
import { NextEvent } from '@/components/events/next-event';
import { PastEvents } from '@/components/events/past-events';

export const metadata: Metadata = {
  title: 'Events · SHESA',
  description: 'Reunions, ceremonies, community drives, and cultural nights — the SHESA calendar.',
};

export default function EventsPage() {
  return (
    <>
      <EventsHero />
      <NextEvent />
      <EventsList />
      <PastEvents />
    </>
  );
}
