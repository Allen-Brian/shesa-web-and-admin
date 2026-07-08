import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EventDetail } from '@/components/events/event-detail';
import { events } from '@/components/events/data';

interface Params {
  readonly slug: string;
}

export function generateStaticParams() {
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = events.find((e) => e.slug === slug);
  if (!event) return { title: 'Event · SHESA' };
  return {
    title: `${event.title} · SHESA Events`,
    description: event.description,
  };
}

export default async function EventPage({ params }: { readonly params: Promise<Params> }) {
  const { slug } = await params;
  const event = events.find((e) => e.slug === slug);
  if (!event) notFound();
  return <EventDetail event={event} />;
}
