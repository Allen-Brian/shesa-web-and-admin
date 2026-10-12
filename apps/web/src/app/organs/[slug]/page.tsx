import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import type {
  OrganDetail,
  OrganLeader,
  OrganPhoto,
  PublicOrgan,
} from '@/components/organs/organs-content';
import { OrganDetailView } from '@/components/organs/organ-detail';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const ORGAN_COLUMNS =
  'id, sector_id, slug, name, short_name, location, country, founded_year, member_count, description, logo_url, contact_email, contact_phone, website_url, achievements';

const LEADER_COLUMNS = 'id, name, role, photo_url, profession, bio, email, phone';

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
}

interface RawLeader {
  readonly id: string;
  readonly name: string;
  readonly role: string | null;
  readonly photo_url: string | null;
  readonly profession: string | null;
  readonly bio: string | null;
  readonly email: string | null;
  readonly phone: string | null;
}

/** Rows written before roles existed are presidents. */
function roleLabel(role: string | null): string {
  return role === 'vice_president' ? 'Vice President' : 'President';
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
 * Everything one branch's page needs.
 *
 * Two round trips rather than one: the leaders and the album are both
 * keyed on the organ's id, which is not known until the first query has
 * run. Nothing else here depends on anything else, so the second trip
 * fetches all three in parallel.
 *
 * Leaders come from both regional tables. A branch is in one or the
 * other, never both, so the union is the answer either way and asking
 * which kind it is first would cost a third round trip to learn nothing.
 */
async function loadOrgan(slug: string): Promise<OrganDetail | null> {
  const supabase = await getServerClient();

  const { data: organRaw } = await supabase
    .schema('cms')
    .from('organs')
    .select(ORGAN_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();

  const raw = organRaw as RawOrgan | null;
  if (!raw) return null;

  const [{ data: sectorRaw }, { data: branchRaw }, { data: diasporaRaw }, { data: albumRaw }] =
    await Promise.all([
      supabase
        .schema('cms')
        .from('organ_sectors')
        .select('name')
        .eq('id', raw.sector_id)
        .maybeSingle(),
      supabase
        .schema('cms')
        .from('branch_leaders')
        .select(LEADER_COLUMNS)
        .eq('organ_id', raw.id)
        .order('role')
        .order('sort_order'),
      supabase
        .schema('cms')
        .from('diaspora_leaders')
        .select(LEADER_COLUMNS)
        .eq('organ_id', raw.id)
        .order('role')
        .order('sort_order'),
      // Newest album wins if an editor has linked more than one. A branch
      // page shows its current pictures, not an archive.
      supabase
        .schema('cms')
        .from('gallery_albums')
        .select('id, title')
        .eq('linked_organ_id', raw.id)
        .order('sort_order')
        .limit(1)
        .maybeSingle(),
    ]);

  const toLeader = (r: RawLeader): OrganLeader => ({
    id: r.id,
    name: r.name,
    role: roleLabel(r.role),
    photo: r.photo_url,
    profession: r.profession,
    bio: r.bio,
    email: r.email,
    phone: r.phone,
  });

  const leaders = [
    ...((branchRaw ?? []) as RawLeader[]).map(toLeader),
    ...((diasporaRaw ?? []) as RawLeader[]).map(toLeader),
  ];

  const album = albumRaw as { id: string; title: string } | null;
  let photos: OrganPhoto[] = [];

  if (album) {
    const { data: mediaRaw } = await supabase
      .schema('cms')
      .from('gallery_media')
      .select('id, src, alt, aspect')
      .eq('album_id', album.id)
      // Photos only. An album can hold video, which the strip on this
      // page has no player for.
      .eq('kind', 'photo')
      .order('sort_order');

    photos = ((mediaRaw ?? []) as OrganPhoto[]).map((m) => ({
      id: m.id,
      src: m.src,
      alt: m.alt,
      aspect: m.aspect,
    }));
  }

  return {
    organ: toOrgan(raw),
    sectorName: (sectorRaw as { name: string } | null)?.name ?? null,
    leaders,
    albumTitle: album?.title ?? null,
    photos,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await loadOrgan(slug);
  if (!detail) return { title: 'Organ not found' };

  const { organ } = detail;
  const where = [organ.location, organ.country].filter(Boolean).join(', ');
  const description =
    organ.description?.slice(0, 160) ??
    `${organ.name}${where ? ` — ${where}` : ''}. ${organ.memberCount} members.`;

  return {
    title: organ.name,
    description,
    alternates: { canonical: `/organs/${organ.slug}` },
    openGraph: {
      title: organ.name,
      description,
      url: `/organs/${organ.slug}`,
      type: 'website',
      ...(organ.logoUrl ? { images: [organ.logoUrl] } : {}),
    },
  };
}

export default async function OrganPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await loadOrgan(slug);
  if (!detail) notFound();

  return <OrganDetailView detail={detail} />;
}
