import { Crown } from 'lucide-react';

import { getServerClient } from '@/lib/supabase-server';

import { LeadershipTabs } from './widgets/leadership-tabs';
import type {
  BatchLeaderRow,
  MainstreamLeaderRow,
  RegionalLeaderRow,
  SectorRow,
} from './widgets/leadership-widget-types';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Leadership' };

/** Shared by the branch and diaspora reads — one table shape, two tables. */
const REGIONAL_COLUMNS =
  'id, branch_name, name, region, photo_url, role, profession, bio, email, phone, organ_id, sort_order';

interface RawSector {
  readonly id: string;
  readonly name: string;
  readonly caption: string | null;
  readonly sort_order: number;
}
interface RawMainstreamLeader {
  readonly id: string;
  readonly sector_id: string;
  readonly position: string;
  readonly name: string;
  readonly location: string | null;
  readonly photo_url: string | null;
  readonly profession: string | null;
  readonly bio: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly sort_order: number;
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
  readonly sort_order: number;
}
interface RawBatch {
  readonly id: string;
  readonly batch: string;
  readonly name: string;
  readonly photo_url: string | null;
  readonly sort_order: number;
}

/**
 * Editor Leadership page — reads every CMS leadership table + the
 * sectors × leaders join, groups mainstream leaders under their
 * sector, and hands the four bundles to the tab shell.
 */
export default async function EditorLeadershipPage() {
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
      .select('id, name, caption, sort_order')
      .order('sort_order'),
    supabase
      .schema('cms')
      .from('mainstream_leaders')
      .select(
        'id, sector_id, position, name, location, photo_url, profession, bio, email, phone, sort_order',
      )
      .order('sort_order'),
    supabase.schema('cms').from('branch_leaders').select(REGIONAL_COLUMNS).order('sort_order'),
    supabase.schema('cms').from('diaspora_leaders').select(REGIONAL_COLUMNS).order('sort_order'),
    supabase
      .schema('cms')
      .from('batch_leaders')
      .select('id, batch, name, photo_url, sort_order')
      .order('sort_order'),
    // Offered in the branch and diaspora dialogs so a leader can be tied
    // to the organ they head. Name and id are all the picker needs.
    supabase.schema('cms').from('organs').select('id, name').order('name'),
  ]);

  const organs = (organsRaw ?? []) as { id: string; name: string }[];

  const sectorRows = (sectorsRaw ?? []) as RawSector[];
  const mainstreamRows = (mainstreamRaw ?? []) as RawMainstreamLeader[];

  const leadersBySector = new Map<string, MainstreamLeaderRow[]>();
  for (const l of mainstreamRows) {
    const bucket = leadersBySector.get(l.sector_id) ?? [];
    bucket.push({
      id: l.id,
      sectorId: l.sector_id,
      position: l.position,
      name: l.name,
      location: l.location,
      photoUrl: l.photo_url,
      profession: l.profession,
      bio: l.bio,
      email: l.email,
      phone: l.phone,
      sortOrder: l.sort_order,
    });
    leadersBySector.set(l.sector_id, bucket);
  }

  const sectors: SectorRow[] = sectorRows.map((s) => ({
    id: s.id,
    name: s.name,
    caption: s.caption,
    sortOrder: s.sort_order,
    leaders: leadersBySector.get(s.id) ?? [],
  }));

  const toRegional = (r: RawRegional): RegionalLeaderRow => ({
    id: r.id,
    branchName: r.branch_name,
    name: r.name,
    region: r.region,
    photoUrl: r.photo_url,
    // Rows written before roles existed are presidents; the surface that
    // created them could not have produced anything else.
    role: r.role ?? 'president',
    profession: r.profession,
    bio: r.bio,
    email: r.email,
    phone: r.phone,
    organId: r.organ_id,
    sortOrder: r.sort_order,
  });

  const branchLeaders = ((branchRaw ?? []) as RawRegional[]).map(toRegional);
  const diasporaLeaders = ((diasporaRaw ?? []) as RawRegional[]).map(toRegional);

  const batchLeaders: BatchLeaderRow[] = ((batchRaw ?? []) as RawBatch[]).map((r) => ({
    id: r.id,
    batch: r.batch,
    name: r.name,
    photoUrl: r.photo_url,
    sortOrder: r.sort_order,
  }));

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Content
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Crown className="h-6 w-6" />
          Leadership
        </h1>
        <p className="text-sm text-muted-foreground">
          Curate the four Leadership strips that appear on the public website — mainstream slate,
          branches, diaspora, and batches. Changes go live immediately.
        </p>
      </header>

      <LeadershipTabs
        sectors={sectors}
        branchLeaders={branchLeaders}
        diasporaLeaders={diasporaLeaders}
        batchLeaders={batchLeaders}
        organs={organs}
      />
    </section>
  );
}
