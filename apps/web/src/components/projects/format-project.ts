import type { Project, ProjectImpact, ProjectMilestone, ProjectStatus } from './projects-content';

export interface RawProject {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly short_description: string | null;
  readonly description_html: string;
  readonly banner_url: string | null;
  readonly status: ProjectStatus;
  readonly started_on: string | null;
  readonly location: string | null;
  readonly lead: string | null;
  readonly is_featured: boolean;
  readonly funding_raised: string | number | null;
  readonly funding_target: string | number | null;
  readonly funding_currency: string | null;
  readonly milestones: unknown;
  readonly impact_stats: unknown;
  /** The finance charge this project raises into; null when not accepting. */
  readonly contribution_charge_id?: string | null;
}

const PLACEHOLDER_BANNER = '/hero_one.jpg';

/**
 * Convert `<p>…</p><p>…</p>` HTML into a list of trimmed paragraph
 * strings. Falls back to a single-item array with the whole HTML when
 * the input doesn't contain paragraph tags.
 */
function paragraphs(html: string): string[] {
  if (!html.trim()) return [];
  const stripped = html
    .replace(/<br\s*\/?>/gi, '\n')
    .split(/<\/?p[^>]*>/gi)
    .map((chunk) => chunk.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
  return stripped.length > 0 ? stripped : [html];
}

function toNum(v: string | number | null): number | null {
  if (v == null) return null;
  const n = typeof v === 'string' ? Number.parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

function toMilestones(v: unknown): ProjectMilestone[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((m) => {
      const row = m as Partial<ProjectMilestone>;
      const title = String(row.title ?? '').trim();
      const date = String(row.date ?? '').trim();
      if (!title && !date) return null;
      return {
        date,
        title,
        body: row.body ? String(row.body) : undefined,
        done: row.done === true,
      };
    })
    .filter((m): m is Exclude<typeof m, null> => m !== null);
}

function toImpact(v: unknown): ProjectImpact[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((s) => {
      const row = s as Partial<ProjectImpact>;
      const value = String(row.value ?? '').trim();
      const label = String(row.label ?? '').trim();
      if (!value && !label) return null;
      return { value, label };
    })
    .filter((s): s is Exclude<typeof s, null> => s !== null);
}

/**
 * Normalise a raw `cms.projects` row plus the joined category names
 * into the shape the public web components consume.
 */
export function formatProject(raw: RawProject, categoryNames: readonly string[]): Project {
  const funding =
    raw.funding_target != null
      ? {
          raised: toNum(raw.funding_raised) ?? 0,
          target: toNum(raw.funding_target) ?? 0,
          currency: raw.funding_currency ?? 'XAF',
        }
      : undefined;

  const milestones = toMilestones(raw.milestones);
  const impact = toImpact(raw.impact_stats);

  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    contributionChargeId: raw.contribution_charge_id ?? null,
    category: categoryNames[0] ?? 'Uncategorised',
    categories: categoryNames,
    status: raw.status,
    shortDescription: raw.short_description ?? '',
    description: paragraphs(raw.description_html),
    image: raw.banner_url ?? PLACEHOLDER_BANNER,
    startedOn: raw.started_on ?? '',
    location: raw.location ?? '',
    lead: raw.lead ?? '',
    featured: raw.is_featured,
    funding,
    impact: impact.length > 0 ? impact : undefined,
    milestones: milestones.length > 0 ? milestones : undefined,
  };
}
