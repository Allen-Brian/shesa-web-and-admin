import { getServerClient } from '@/lib/supabase-server';

import type { OrganRow, SectorRow } from './widgets/organ-widget-types';

interface RawSector {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly sort_order: number;
}

interface RawOrgan {
  readonly id: string;
  readonly sector_id: string;
  readonly slug: string;
  readonly name: string;
  readonly short_name: string | null;
  readonly location: string | null;
  readonly country: string | null;
  readonly founded_year: number | null;
  readonly member_count: number;
  readonly description: string | null;
  readonly logo_url: string | null;
  readonly contact_email: string | null;
  readonly contact_phone: string | null;
  readonly website_url: string | null;
  readonly achievements: string[] | null;
  readonly sort_order: number;
  readonly created_at: string;
  readonly updated_at: string;
}

function normaliseOrgan(raw: RawOrgan): OrganRow {
  return {
    id: raw.id,
    sectorId: raw.sector_id,
    slug: raw.slug,
    name: raw.name,
    shortName: raw.short_name,
    location: raw.location,
    country: raw.country,
    foundedYear: raw.founded_year,
    memberCount: raw.member_count,
    description: raw.description,
    logoUrl: raw.logo_url,
    contactEmail: raw.contact_email,
    contactPhone: raw.contact_phone,
    websiteUrl: raw.website_url,
    achievements: raw.achievements ?? [],
    sortOrder: raw.sort_order,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

/** An album as the organ form's picker needs it. */
export interface LinkableAlbum {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly dateLabel: string | null;
  /** The organ it currently points at, if any. */
  readonly linkedOrganId: string | null;
}

export interface LoadedOrgans {
  readonly organs: readonly OrganRow[];
  readonly sectors: readonly SectorRow[];
  readonly albums: readonly LinkableAlbum[];
}

/** Server-side loader for the editor Organs surface. */
export async function loadEditorOrgans(): Promise<LoadedOrgans> {
  const supabase = await getServerClient();

  const [{ data: organsRaw }, { data: albumsRaw }, { data: sectorsRaw }] = await Promise.all([
    supabase
      .schema('cms')
      .from('organs')
      .select(
        'id, sector_id, slug, name, short_name, location, country, founded_year, member_count, description, logo_url, contact_email, contact_phone, website_url, achievements, sort_order, created_at, updated_at',
      )
      .order('sort_order')
      .order('name'),
    // Offered in the organ form's album picker. `linked_organ_id` comes
    // along so the form can show which album already points at this organ.
    supabase
      .schema('cms')
      .from('gallery_albums')
      .select('id, title, slug, date_label, linked_organ_id')
      .order('sort_order')
      .order('created_at', { ascending: false }),
    supabase
      .schema('cms')
      .from('organ_sectors')
      .select('id, name, slug, description, sort_order')
      .order('sort_order'),
  ]);

  const organs: OrganRow[] = ((organsRaw ?? []) as RawOrgan[]).map(normaliseOrgan);
  const sectors: SectorRow[] = ((sectorsRaw ?? []) as RawSector[]).map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    sortOrder: s.sort_order,
  }));

  const albums: LinkableAlbum[] = (
    (albumsRaw ?? []) as {
      id: string;
      title: string;
      slug: string;
      date_label: string | null;
      linked_organ_id: string | null;
    }[]
  ).map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    dateLabel: a.date_label,
    linkedOrganId: a.linked_organ_id,
  }));

  return { organs, sectors, albums };
}
