import type { Metadata } from 'next';

import type { PublicOrgan, PublicOrganSector } from '@/components/organs/organs-content';
import { OrgansHero } from '@/components/organs/organs-hero';
import { OrgansSections } from '@/components/organs/organs-sections';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Organs',
  description:
    'Every SHESA organ, the National body, the sectors, and the branches. From Yaoundé to Berlin to Washington.',
  alternates: { canonical: '/organs' },
  openGraph: {
    title: 'Organs',
    description:
      'Every SHESA organ, the National body, the sectors, and the branches. From Yaound\u00e9 to Berlin to Washington.',
    url: '/organs',
    type: 'website',
  },
};

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
}

function toOrgan(r: RawOrgan): PublicOrgan {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortName: r.short_name,
    location: r.location,
    country: r.country,
    foundedYear: r.founded_year,
    memberCount: r.member_count,
    description: r.description,
    logoUrl: r.logo_url,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    websiteUrl: r.website_url,
    achievements: r.achievements ?? [],
  };
}

/**
 * Public Organs page. Fetches every sector + organ in one round trip
 * and groups organs under their sector heading. Empty sectors are
 * hidden by the section renderer so a fresh install without organs
 * only shows the hero.
 */
export default async function OrgansPage() {
  const supabase = await getServerClient();

  const [{ data: sectorsRaw }, { data: organsRaw }] = await Promise.all([
    supabase
      .schema('cms')
      .from('organ_sectors')
      .select('id, name, slug, description, sort_order')
      .order('sort_order'),
    supabase
      .schema('cms')
      .from('organs')
      .select(
        'id, sector_id, slug, name, short_name, location, country, founded_year, member_count, description, logo_url, contact_email, contact_phone, website_url, achievements, sort_order',
      )
      .order('sort_order')
      .order('name'),
  ]);

  const organs = ((organsRaw ?? []) as RawOrgan[]).map(toOrgan);
  const organsBySector = new Map<string, PublicOrgan[]>();
  for (const o of (organsRaw ?? []) as RawOrgan[]) {
    const bucket = organsBySector.get(o.sector_id) ?? [];
    bucket.push(toOrgan(o));
    organsBySector.set(o.sector_id, bucket);
  }

  const sectors: PublicOrganSector[] = ((sectorsRaw ?? []) as RawSector[]).map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    organs: organsBySector.get(s.id) ?? [],
  }));

  const memberCount = organs.reduce((n, o) => n + o.memberCount, 0);

  return (
    <>
      <OrgansHero
        sectorCount={sectors.filter((s) => s.organs.length > 0).length}
        organCount={organs.length}
        memberCount={memberCount}
      />
      <OrgansSections sectors={sectors} />
    </>
  );
}
