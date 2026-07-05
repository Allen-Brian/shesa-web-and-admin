import { notFound } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';
import { resolveMemberBadges } from '@/lib/resolve-badges';
import type { ExcoBadgeInfo } from '@/components/governance/exco-badge';

import { MembersPage, type MembersPageRow, type MembersPageScope } from './widgets/members-page';

export const dynamic = 'force-dynamic';

interface Params {
  readonly params: Promise<{ scopeSlug: string }>;
}

export default async function MembersScopePage({ params }: Params) {
  const { scopeSlug } = await params;
  const supabase = await getServerClient();

  const { data: scopeRow } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, name, slug, scope_type, chapter_kind, status')
    .eq('slug', scopeSlug)
    .maybeSingle();

  if (!scopeRow) notFound();

  const isBranchLike =
    scopeRow.scope_type === 'branch' ||
    (scopeRow.scope_type === 'chapter' && scopeRow.chapter_kind === 'autonomous');

  // Memberships is exclusive to branch-like scopes (post 2026-07-05).
  // Batches, grouping chapters, houses, and networks are not memberable —
  // their members are viewed through the Clusters section instead.
  if (!isBranchLike) notFound();

  const scopeMeta: MembersPageScope = {
    id: scopeRow.id,
    slug: scopeRow.slug,
    name: scopeRow.name,
    scope_type: scopeRow.scope_type as 'branch' | 'chapter',
    chapter_kind: scopeRow.chapter_kind as 'autonomous' | 'grouping' | null,
  };

  const rows: MembersPageRow[] = await fetchBranchOrChapterMembers(supabase, scopeRow.id);

  return <MembersPage scope={scopeMeta} rows={rows} />;
}

type Client = Awaited<ReturnType<typeof getServerClient>>;

/**
 * Members roster for a branch or autonomous chapter — reads
 * `core.memberships` at the scope, joins members + registration + refs.
 */
async function fetchBranchOrChapterMembers(
  supabase: Client,
  scopeId: string,
): Promise<MembersPageRow[]> {
  const { data: memberships } = await supabase
    .schema('core')
    .from('memberships')
    .select('id, member_id, membership_status, engagement, joined_at')
    .eq('scope_id', scopeId)
    .in('membership_status', ['active', 'passive', 'pending']);

  const membershipList = memberships ?? [];
  const memberIds = membershipList.map((m) => m.member_id);
  const membershipIds = membershipList.map((m) => m.id);

  const [{ data: members }, { data: registration }] = await Promise.all([
    memberIds.length
      ? supabase
          .schema('core')
          .from('members')
          .select(
            'id, full_name, batch_scope_id, network_scope_id, house_scope_id, current_country, current_region_state, current_city',
          )
          .in('id', memberIds)
      : Promise.resolve({ data: [] as MemberBrief[] }),
    membershipIds.length
      ? supabase
          .schema('core')
          .from('registration_status')
          .select('membership_id, fee_required, marked_paid_at, waived_at, paid_on_behalf_at')
          .in('membership_id', membershipIds)
      : Promise.resolve({ data: [] as RegistrationBrief[] }),
  ]);

  const memberById = new Map((members ?? []).map((m) => [m.id, m]));
  const regByMembership = new Map((registration ?? []).map((r) => [r.membership_id, r]));

  const refIds = Array.from(
    new Set(
      (members ?? []).flatMap((m) => [m.batch_scope_id, m.network_scope_id, m.house_scope_id]),
    ),
  );
  const { data: refScopes } = refIds.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, scope_type, entry_year')
        .in('id', refIds)
    : { data: [] as RefScope[] };
  const refMap = new Map((refScopes ?? []).map((s) => [s.id, s]));

  const badges = await resolveMemberBadges(supabase, memberIds);

  return membershipList.map((mem) =>
    rowFromMembership(mem, memberById, refMap, badges, regByMembership),
  );
}

// ─── Types local to this file ───────────────────────────────────────

interface MemberBrief {
  id: string;
  full_name: string;
  batch_scope_id: string;
  network_scope_id: string;
  house_scope_id: string;
  current_country: string | null;
  current_region_state: string | null;
  current_city: string | null;
}

interface RegistrationBrief {
  membership_id: string;
  fee_required: boolean;
  marked_paid_at: string | null;
  waived_at: string | null;
  paid_on_behalf_at: string | null;
}

interface RefScope {
  id: string;
  name: string;
  scope_type: string;
  entry_year: number | null;
}

interface MembershipBrief {
  id: string;
  member_id: string;
  membership_status: string;
  engagement: string;
  joined_at: string | null;
}

function rowFromMembership(
  mem: MembershipBrief,
  memberById: Map<string, MemberBrief>,
  refMap: Map<string, RefScope>,
  badges: ReadonlyMap<string, ExcoBadgeInfo>,
  regByMembership: Map<string, RegistrationBrief>,
): MembersPageRow {
  const member = memberById.get(mem.member_id);
  const batch = member ? refMap.get(member.batch_scope_id) : undefined;
  const reg = regByMembership.get(mem.id);
  const location = member
    ? [member.current_city, member.current_region_state, member.current_country]
        .filter(Boolean)
        .join(', ')
    : '';

  const registration_state = reg ? computeRegistrationState(reg) : null;

  return {
    membership_id: mem.id,
    member_id: mem.member_id,
    full_name: member?.full_name ?? '(missing member)',
    badge: badges.get(mem.member_id) ?? null,
    batch_year: batch?.entry_year ?? null,
    batch_name: batch?.name ?? null,
    network_name: member ? (refMap.get(member.network_scope_id)?.name ?? null) : null,
    house_name: member ? (refMap.get(member.house_scope_id)?.name ?? null) : null,
    branch_name: null, // Branch column is hidden when viewer is a branch, and irrelevant otherwise
    location: location || null,
    membership_status: mem.membership_status as MembersPageRow['membership_status'],
    engagement: mem.engagement as MembersPageRow['engagement'],
    registration_state,
    joined_at: mem.joined_at,
  };
}

/**
 * Client-side mirror of `core.registration_state()` — used to avoid an
 * extra RPC. Keep in sync with the SQL function + the domain helper.
 */
function computeRegistrationState(reg: RegistrationBrief): MembersPageRow['registration_state'] {
  if (!reg.fee_required) return 'not_required';
  if (reg.marked_paid_at) return 'paid';
  if (reg.waived_at) return 'waived';
  if (reg.paid_on_behalf_at) return 'paid_on_behalf';
  return 'pending';
}
