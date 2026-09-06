import type { Metadata } from 'next';

import type { SiteEvent } from '@/components/events/events-content';
import { EventsHero } from '@/components/events/events-hero';
import { EventsList } from '@/components/events/events-list';
import { formatEvent, type RawSiteEvent } from '@/components/events/format-event';
import { NextEvent } from '@/components/events/next-event';
import { PartnersStrip } from '@/components/home/partners-strip';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Events',
  description: 'Reunions, ceremonies, community drives, and cultural nights, the SHESA calendar.',
  alternates: { canonical: '/events' },
  openGraph: {
    title: 'Events',
    description: 'Reunions, ceremonies, community drives, and cultural nights, the SHESA calendar.',
    url: '/events',
    type: 'website',
  },
};

interface RawCategory {
  readonly id: string;
  readonly name: string;
}
interface RawMap {
  readonly event_id: string;
  readonly category_id: string;
}

/**
 * Public Events page. Fetches every `cms.site_events` row + category
 * join in one round trip, formats to the public `SiteEvent` shape,
 * splits into upcoming + past, and hands each strip its slice.
 */
export default async function EventsPage() {
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

  const all: SiteEvent[] = ((eventsRaw ?? []) as RawSiteEvent[]).map((r) =>
    formatEvent(r, catsByEvent.get(r.id) ?? []),
  );

  const upcoming = all.filter((e) => e.upcoming);
  const past = all.filter((e) => !e.upcoming).sort((a, b) => b.fullDate.localeCompare(a.fullDate));

  const featured = all.find((e) => e.featured) ?? upcoming[0] ?? null;
  const categories = Array.from(catNameById.values()).sort();

  return (
    <>
      <EventsHero upcomingCount={upcoming.length} pastCount={past.length} />
      <NextEvent featuredEvent={featured} />
      <EventsList events={all} categories={categories} />
      {/* Partner boards always sit last, immediately above the footer. */}
      <PartnersStrip />
    </>
  );
}
