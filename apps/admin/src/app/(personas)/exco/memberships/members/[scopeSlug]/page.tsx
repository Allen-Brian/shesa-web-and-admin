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
  const isBatch = scopeRow.scope_type === 'batch';

  if (!isBranchLike && !isBatch) notFound(); // grouping chapters, houses, networks, etc.

  const scopeMeta: MembersPageScope = {
    id: scopeRow.id,
    slug: scopeRow.slug,
    name: scopeRow.name,
    scope_type: scopeRow.scope_type as 'branch' | 'chapter' | 'batch',
    chapter_kind: scopeRow.chapter_kind as 'autonomous' | 'grouping' | null,
  };

  const rows: MembersPageRow[] = isBatch
    ? await fetchBatchMembers(supabase, scopeRow.id)
    : await fetchBranchOrChapterMembers(supabase, scopeRow.id);

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

/**
 * Members roster for a batch — attribute-linked via
 * `members.batch_scope_id`. No `core.memberships` rows at the batch,
 * so engagement/registration are N/A; branch shown is the member's
 * current active geographic body (if any).
 */
async function fetchBatchMembers(supabase: Client, scopeId: string): Promise<MembersPageRow[]> {
  const { data: members } = await supabase
    .schema('core')
    .from('members')
    .select(
      'id, full_name, batch_scope_id, network_scope_id, house_scope_id, current_country, current_region_state, current_city',
    )
    .eq('batch_scope_id', scopeId);

  const memberList = members ?? [];
  const memberIds = memberList.map((m) => m.id);

  const refIds = Array.from(
    new Set(memberList.flatMap((m) => [m.network_scope_id, m.house_scope_id])),
  );
  const [{ data: refScopes }, { data: memberships }] = await Promise.all([
    refIds.length
      ? supabase
          .schema('core')
          .from('scopes')
          .select('id, name, scope_type, entry_year')
          .in('id', refIds)
      : Promise.resolve({ data: [] as RefScope[] }),
    memberIds.length
      ? supabase
          .schema('core')
          .from('memberships')
          .select('member_id, scope_id, membership_status, engagement')
          .in('member_id', memberIds)
          .in('membership_status', ['active', 'passive'])
      : Promise.resolve({
          data: [] as {
            member_id: string;
            scope_id: string;
            membership_status: string;
            engagement: string;
          }[],
        }),
  ]);
  const refMap = new Map((refScopes ?? []).map((s) => [s.id, s]));

  const geoScopeIds = Array.from(new Set((memberships ?? []).map((m) => m.scope_id)));
  const { data: geoScopes } = geoScopeIds.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, scope_type, chapter_kind')
        .in('id', geoScopeIds)
    : {
        data: [] as { id: string; name: string; scope_type: string; chapter_kind: string | null }[],
      };
  const geoScopeById = new Map((geoScopes ?? []).map((s) => [s.id, s]));

  // For each member, surface the ONE geographic membership (branch or
  // autonomous chapter) they currently belong to. The batch admin doesn't
  // administer that scope directly, but the RLS extension in
  // 20260704130000_member_transfer_and_membership_attribute_reads lets
  // them read the row for informational display — branch name, status,
  // engagement tier all come from here.
  const geoByMember = new Map<string, { name: string; status: string; engagement: string }>();
  for (const m of memberships ?? []) {
    const scope = geoScopeById.get(m.scope_id);
    if (!scope) continue;
    const isGeographic =
      scope.scope_type === 'branch' ||
      (scope.scope_type === 'chapter' && scope.chapter_kind === 'autonomous');
    if (!isGeographic) continue;
    if (!geoByMember.has(m.member_id)) {
      geoByMember.set(m.member_id, {
        name: scope.name,
        status: m.membership_status,
        engagement: m.engagement,
      });
    }
  }

  const badges = await resolveMemberBadges(supabase, memberIds);

  return memberList.map((m) => {
    const geo = geoByMember.get(m.id);
    const location = [m.current_city, m.current_region_state, m.current_country]
      .filter(Boolean)
      .join(', ');
    return {
      membership_id: null, // no membership row exists AT THE BATCH itself
      member_id: m.id,
      full_name: m.full_name,
      badge: badges.get(m.id) ?? null,
      batch_year: null, // hidden anyway when viewing a batch
      batch_name: null,
      network_name: refMap.get(m.network_scope_id)?.name ?? null,
      house_name: refMap.get(m.house_scope_id)?.name ?? null,
      branch_name: geo?.name ?? null,
      location: location || null,
      // Membership + engagement reflect the member's CURRENT geographic
      // body — informational context for the batch admin, not batch-
      // scoped state.
      membership_status: (geo?.status as MembersPageRow['membership_status']) ?? null,
      engagement: (geo?.engagement as MembersPageRow['engagement']) ?? null,
      registration_state: null, // batches don't carry registration
    };
  });
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
