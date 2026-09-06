import { getServerClient } from '@/lib/supabase-server';

import type { CategoryRow, ProgramItem, SiteEventRow } from './widgets/site-event-widget-types';
import { loadContentMetrics, NO_METRICS } from '@/lib/content-metrics';

interface RawEvent {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly short_description: string | null;
  readonly description_html: string;
  readonly banner_url: string | null;
  readonly starts_at: string;
  readonly ends_at: string | null;
  readonly location: string | null;
  readonly city: string | null;
  readonly is_featured: boolean;
  readonly has_ticketing: boolean;
  readonly ticket_url: string | null;
  readonly ticket_price: string | number | null;
  readonly ticket_currency: string | null;
  readonly flyers: unknown;
  readonly program: unknown;
  readonly album_slug: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

interface RawCategory {
  readonly id: string;
  readonly name: string;
  readonly sort_order: number;
}

interface RawMap {
  readonly event_id: string;
  readonly category_id: string;
}

function toNum(v: string | number | null): number | null {
  if (v == null) return null;
  const n = typeof v === 'string' ? Number.parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

function toProgram(v: unknown): ProgramItem[] {
  if (!Array.isArray(v)) return [];
  return v.map((p) => {
    const row = p as Partial<ProgramItem>;
    return {
      time: String(row.time ?? ''),
      title: String(row.title ?? ''),
      description: row.description ? String(row.description) : undefined,
    };
  });
}

function normalise(
  raw: RawEvent,
  categoryIds: readonly string[],
): Omit<SiteEventRow, 'views' | 'likes'> {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    shortDescription: raw.short_description,
    descriptionHtml: raw.description_html,
    bannerUrl: raw.banner_url,
    startsAt: raw.starts_at,
    endsAt: raw.ends_at,
    location: raw.location,
    city: raw.city,
    isFeatured: raw.is_featured,
    hasTicketing: raw.has_ticketing,
    ticketUrl: raw.ticket_url,
    ticketPrice: toNum(raw.ticket_price),
    ticketCurrency: raw.ticket_currency,
    flyers: toStringArray(raw.flyers),
    program: toProgram(raw.program),
    albumSlug: raw.album_slug,
    categoryIds,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export interface LoadedSiteEvents {
  readonly events: readonly SiteEventRow[];
  readonly categories: readonly CategoryRow[];
}

/** Server-side loader for the editor Site Events surface. */
export async function loadEditorSiteEvents(): Promise<LoadedSiteEvents> {
  const supabase = await getServerClient();

  const [{ data: eventsRaw }, { data: categoriesRaw }, { data: mapRaw }] = await Promise.all([
    supabase
      .schema('cms')
      .from('site_events')
      .select(
        'id, slug, title, short_description, description_html, banner_url, starts_at, ends_at, location, city, is_featured, has_ticketing, ticket_url, ticket_price, ticket_currency, flyers, program, album_slug, created_at, updated_at',
      )
      .order('is_featured', { ascending: false })
      .order('starts_at', { ascending: false }),
    supabase
      .schema('cms')
      .from('site_event_categories')
      .select('id, name, sort_order')
      .order('sort_order'),
    supabase.schema('cms').from('site_event_categories_map').select('event_id, category_id'),
  ]);

  const catsByEvent = new Map<string, string[]>();
  for (const m of (mapRaw ?? []) as RawMap[]) {
    const bucket = catsByEvent.get(m.event_id) ?? [];
    bucket.push(m.category_id);
    catsByEvent.set(m.event_id, bucket);
  }

  const metrics = await loadContentMetrics('event');
  const events: SiteEventRow[] = ((eventsRaw ?? []) as RawEvent[]).map((e) => ({
    ...normalise(e, catsByEvent.get(e.id) ?? []),
    ...(metrics.get(e.id) ?? NO_METRICS),
  }));

  const categories: CategoryRow[] = ((categoriesRaw ?? []) as RawCategory[]).map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sort_order,
  }));

  return { events, categories };
}
