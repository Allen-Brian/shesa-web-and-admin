import { getServerClient } from '@/lib/supabase-server';

import type { OrganRow, SectorRow } from './widgets/types';

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
    sortOrder: raw.sort_order,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export interface LoadedOrgans {
  readonly organs: readonly OrganRow[];
  readonly sectors: readonly SectorRow[];
}

/** Server-side loader for the editor Organs surface. */
export async function loadEditorOrgans(): Promise<LoadedOrgans> {
  const supabase = await getServerClient();

  const [{ data: organsRaw }, { data: sectorsRaw }] = await Promise.all([
    supabase
      .schema('cms')
      .from('organs')
      .select(
        'id, sector_id, slug, name, short_name, location, country, founded_year, member_count, description, logo_url, contact_email, contact_phone, website_url, sort_order, created_at, updated_at',
      )
      .order('sort_order')
      .order('name'),
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

  return { organs, sectors };
}
