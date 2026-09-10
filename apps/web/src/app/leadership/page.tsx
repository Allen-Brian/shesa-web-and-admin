import { orderByOffice } from '@shesa/domain/governance';
import type { Metadata } from 'next';

import { BatchPresidents, type BatchPresident } from '@/components/leadership/batch-presidents';
import { BranchPresidents, type BranchPresident } from '@/components/leadership/branch-presidents';
import {
  DiasporaPresidents,
  type DiasporaPresident,
} from '@/components/leadership/diaspora-presidents';
import { LeaderProfileProvider } from '@/components/leadership/leader-profile-modal';
import { LeadershipHero } from '@/components/leadership/leadership-hero';
import { MainOrgan, type Leader, type Tier } from '@/components/leadership/main-organ';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Leadership',
  description:
    'The SHESA Executive Committee, branch presidents, and batch chairs of the SHESA alumni.',
  alternates: { canonical: '/leadership' },
  openGraph: {
    title: 'Leadership',
    description:
      'The SHESA Executive Committee, branch presidents, and batch chairs of the SHESA alumni.',
    url: '/leadership',
    type: 'website',
  },
};

// ── Raw shapes from the `cms` schema ─────────────────────────────────

interface RawSector {
  readonly id: string;
  readonly name: string;
  readonly caption: string | null;
}
interface RawMainstreamLeader {
  readonly id: string;
  readonly sector_id: string;
  readonly position: string;
  readonly name: string;
  readonly location: string | null;
  readonly photo_url: string | null;
  readonly sort_order: number | null;
  readonly profession: string | null;
  readonly bio: string | null;
  readonly email: string | null;
  readonly phone: string | null;
}
interface RawRegional {
  readonly id: string;
  readonly branch_name: string;
  readonly name: string;
  readonly region: string | null;
  readonly photo_url: string | null;
  readonly role: string | null;
  readonly profession: string | null;
  readonly bio: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly organ_id: string | null;
}

/** Rows written before roles existed are presidents. */
function roleLabel(role: string | null): string {
  return role === 'vice_president' ? 'Vice President' : 'President';
}
interface RawBatch {
  readonly id: string;
  readonly batch: string;
  readonly name: string;
  readonly photo_url: string | null;
}

const PLACEHOLDER_PHOTO = '/president_one.jpg';

/** Shared by the branch and diaspora reads — same table shape, same needs. */
const REGIONAL_COLUMNS =
  'id, branch_name, name, region, photo_url, role, profession, bio, email, phone, organ_id';

/**
 * Public Leadership page, reads all four CMS strips (mainstream slate
 * + branches + diaspora + batches) in one Promise.all and hands each
 * bundle to its rendering component. Every rendering component keeps
 * its client-side animation shell; the server just supplies data.
 *
 * When a table is empty the component renders its seeded fallback so a
 * fresh-install site never looks broken. Editors curating from the
 * admin portal see their changes appear the next request cycle.
 */
export default async function LeadershipPage() {
  const supabase = await getServerClient();

  const [
    { data: sectorsRaw },
    { data: mainstreamRaw },
    { data: branchRaw },
    { data: diasporaRaw },
    { data: batchRaw },
    { data: organsRaw },
  ] = await Promise.all([
    supabase
      .schema('cms')
      .from('mainstream_sectors')
      .select('id, name, caption')
      .order('sort_order'),
    supabase
      .schema('cms')
      .from('mainstream_leaders')
      .select(
        'id, sector_id, position, name, location, photo_url, sort_order, profession, bio, email, phone',
      )
      .order('sort_order'),
    supabase
      .schema('cms')
      .from('branch_leaders')
      // Presidents first within a branch, then vice presidents — `role`
      // sorts that way alphabetically, which is a happy accident worth
      // not relying on, hence the explicit order.
      .select(REGIONAL_COLUMNS)
      .order('branch_name')
      .order('role')
      .order('sort_order'),
    supabase
      .schema('cms')
      .from('diaspora_leaders')
      // Same ordering as the branches above, for the same reason: a
      // chapter's president has to precede its vice.
      .select(REGIONAL_COLUMNS)
      .order('branch_name')
      .order('role')
      .order('sort_order'),
    supabase
      .schema('cms')
      .from('batch_leaders')
      .select('id, batch, name, photo_url')
      .order('sort_order'),
    // Only what a link needs. The branch page itself reads the rest.
    supabase.schema('cms').from('organs').select('id, slug, name'),
  ]);

  const organById = new Map(
    ((organsRaw ?? []) as { id: string; slug: string; name: string }[]).map((o) => [o.id, o]),
  );

  const sectors = (sectorsRaw ?? []) as RawSector[];
  const mainstream = (mainstreamRaw ?? []) as RawMainstreamLeader[];
  const leadersBySector = new Map<string, (Leader & { sortOrder: number })[]>();
  for (const l of mainstream) {
    const bucket = leadersBySector.get(l.sector_id) ?? [];
    bucket.push({
      name: l.name,
      position: l.position,
      location: l.location ?? undefined,
      photo: l.photo_url ?? PLACEHOLDER_PHOTO,
      slug: l.id,
      profession: l.profession,
      bio: l.bio,
      email: l.email,
      phone: l.phone,
      sortOrder: l.sort_order ?? 0,
    });
    leadersBySector.set(l.sector_id, bucket);
  }

  // `sort_order` alone let an assistant print above the office it
  // assists. Reordered per sector so an office and its deputies stay
  // together, principal first — see lib/leadership-order.
  const tiers: Tier[] = sectors
    .map((s) => ({
      heading: s.name,
      caption: s.caption ?? '',
      leaders: orderByOffice(leadersBySector.get(s.id) ?? []).map((l): Leader => ({
        name: l.name,
        position: l.position,
        location: l.location,
        photo: l.photo,
        slug: l.slug,
      })),
    }))
    .filter((t) => t.leaders.length > 0);

  /** The half of a president's card that both regional strips share. */
  const regionalBase = (r: RawRegional) => {
    const organ = r.organ_id ? organById.get(r.organ_id) : undefined;
    return {
      name: r.name,
      city: r.region ?? '',
      photo: r.photo_url ?? PLACEHOLDER_PHOTO,
      slug: r.id,
      role: roleLabel(r.role),
      profession: r.profession,
      bio: r.bio,
      email: r.email,
      phone: r.phone,
      // Only when the editor has linked one. Guessing from `branch_name`
      // would produce dead links the day a branch is renamed.
      organHref: organ ? `/organs/${organ.slug}` : null,
    };
  };

  const branchPresidents: BranchPresident[] = ((branchRaw ?? []) as RawRegional[]).map((r) => ({
    ...regionalBase(r),
    branch: r.branch_name,
  }));

  const diasporaPresidents: DiasporaPresident[] = ((diasporaRaw ?? []) as RawRegional[]).map(
    (r) => ({
      ...regionalBase(r),
      chapter: r.branch_name,
    }),
  );

  const batchPresidents: BatchPresident[] = ((batchRaw ?? []) as RawBatch[]).map((r) => ({
    name: r.name,
    batch: r.batch,
    photo: r.photo_url ?? PLACEHOLDER_PHOTO,
    slug: r.id,
  }));

  return (
    // One modal for all four strips, mounted here so a card only has to
    // say which profile to open.
    <LeaderProfileProvider>
      <LeadershipHero />
      <MainOrgan tiers={tiers} />
      <BranchPresidents presidents={branchPresidents} />
      <DiasporaPresidents presidents={diasporaPresidents} />
      <BatchPresidents presidents={batchPresidents} />
    </LeaderProfileProvider>
  );
}
