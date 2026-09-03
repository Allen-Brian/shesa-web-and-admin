import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import type { SiteEvent } from '@/components/events/events-content';
import { EventDetail } from '@/components/events/event-detail';
import { formatEvent, type RawSiteEvent } from '@/components/events/format-event';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface Params {
  readonly slug: string;
}

interface RawCategory {
  readonly id: string;
  readonly name: string;
}
interface RawMap {
  readonly event_id: string;
  readonly category_id: string;
}

/**
 * Load every event + its category names into an in-memory array.
 * Used for both metadata generation and the page renderer, the per
 * request cost is small (10-50 rows), and returning the full set
 * lets us compute related events locally.
 */
async function loadAllEvents(): Promise<readonly SiteEvent[]> {
  const supabase = await getServerClient();

  const [{ data: eventsRaw }, { data: categoriesRaw }, { data: mapRaw }] = await Promise.all([
    supabase
      .schema('cms')
      .from('site_events')
      .select(
        'id, slug, title, short_description, description_html, banner_url, starts_at, ends_at, location, city, is_featured, has_ticketing, ticket_url, ticket_price, ticket_currency, flyers, program, album_slug',
      )
      .order('starts_at', { ascending: true }),
    supabase.schema('cms').from('site_event_categories').select('id, name'),
    supabase.schema('cms').from('site_event_categories_map').select('event_id, category_id'),
  ]);

  const catNameById = new Map(((categoriesRaw ?? []) as RawCategory[]).map((c) => [c.id, c.name]));
  const catsByEvent = new Map<string, string[]>();
  for (const m of (mapRaw ?? []) as RawMap[]) {
    const name = catNameById.get(m.category_id);
    if (!name) continue;
    const bucket = catsByEvent.get(m.event_id) ?? [];
    bucket.push(name);
    catsByEvent.set(m.event_id, bucket);
  }

  return ((eventsRaw ?? []) as RawSiteEvent[]).map((r) =>
    formatEvent(r, catsByEvent.get(r.id) ?? []),
  );
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const list = await loadAllEvents();
  const event = list.find((e) => e.slug === slug);
  if (!event) return { title: 'Event · SHESA' };
  return {
    title: `${event.title} · SHESA Events`,
    description: event.description,
  };
}

/**
 * When an event has no manual `album_slug`, look for a Gallery album
 * that points BACK to this event via `linked_event_id` and use its
 * slug. Manual slug wins so an editor can still hand-craft the link.
 */
async function resolveAlbumSlug(
  eventId: string,
  manualSlug: string | undefined,
): Promise<string | undefined> {
  if (manualSlug) return manualSlug;
  const supabase = await getServerClient();
  const { data } = await supabase
    .schema('cms')
    .from('gallery_albums')
    .select('slug')
    .eq('linked_event_id', eventId)
    .maybeSingle();
  return (data as { slug: string } | null)?.slug ?? undefined;
}

export default async function EventPage({ params }: { readonly params: Promise<Params> }) {
  const { slug } = await params;
  const list = await loadAllEvents();
  const event = list.find((e) => e.slug === slug);
  if (!event) notFound();

  const resolvedAlbumSlug = await resolveAlbumSlug(event.id, event.albumSlug);
  const enrichedEvent: SiteEvent = { ...event, albumSlug: resolvedAlbumSlug };

  const pool = event.upcoming ? list.filter((e) => e.upcoming) : list;
  const related = pool.filter((e) => e.id !== event.id).slice(0, 3);

  return <EventDetail event={enrichedEvent} related={related} />;
}
