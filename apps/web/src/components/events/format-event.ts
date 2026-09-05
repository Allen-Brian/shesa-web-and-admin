import type { ProgramItem, SiteEvent } from './events-content';

export interface RawSiteEvent {
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
  /** The finance charge this event collects into; null when not accepting. */
  readonly contribution_charge_id?: string | null;
}

const PLACEHOLDER_BANNER = '/hero_one.jpg';
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function paragraphs(html: string): string[] {
  if (!html.trim()) return [];
  const stripped = html
    .replace(/<br\s*\/?>/gi, '\n')
    .split(/<\/?p[^>]*>/gi)
    .map((chunk) => chunk.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
  return stripped;
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
  return v
    .map((p) => {
      const row = p as Partial<ProgramItem>;
      const day = String(row.day ?? '').trim();
      const time = String(row.time ?? '').trim();
      const title = String(row.title ?? '').trim();
      if (!time && !title) return null;
      return {
        day: day || undefined,
        time,
        title,
        description: row.description ? String(row.description) : undefined,
      };
    })
    .filter((p): p is Exclude<typeof p, null> => p !== null);
}

/**
 * Normalise a raw `cms.site_events` row + joined category names into
 * the public `SiteEvent` shape. Derives the display date components
 * from `starts_at` and the `upcoming` flag from now-vs-starts.
 *
 * The description_html is split into paragraphs so the detail page
 * keeps its per-paragraph fade-in, the shortened intro sits in
 * `description`, the rest in `extendedDescription`.
 */
export function formatEvent(raw: RawSiteEvent, categoryNames: readonly string[]): SiteEvent {
  const starts = new Date(raw.starts_at);
  const paras = paragraphs(raw.description_html);
  const flyers = toStringArray(raw.flyers);
  const program = toProgram(raw.program);

  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    day: String(starts.getDate()),
    month: MONTH_LABELS[starts.getMonth()] ?? '',
    year: String(starts.getFullYear()),
    fullDate: starts.toISOString().slice(0, 10),
    location: raw.location ?? '',
    city: raw.city ?? '',
    image: raw.banner_url ?? PLACEHOLDER_BANNER,
    description: raw.short_description ?? paras[0] ?? '',
    summary: raw.short_description ?? undefined,
    descriptionHtml: raw.description_html?.trim() ? raw.description_html : undefined,
    category: categoryNames[0] ?? 'Uncategorised',
    categories: categoryNames,
    upcoming: starts.getTime() > Date.now(),
    featured: raw.is_featured,
    albumSlug: raw.album_slug ?? undefined,
    contributionChargeId: raw.contribution_charge_id ?? null,
    flyers: flyers.length > 0 ? flyers : undefined,
    program: program.length > 0 ? program : undefined,
    extendedDescription: paras.length > 1 ? paras.slice(1) : undefined,
    ticketUrl: raw.has_ticketing && raw.ticket_url ? raw.ticket_url : undefined,
    ticketPrice: raw.has_ticketing ? (toNum(raw.ticket_price) ?? undefined) : undefined,
    ticketCurrency: raw.has_ticketing && raw.ticket_currency ? raw.ticket_currency : undefined,
  };
}
