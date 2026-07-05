import { redirect } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import { InvitesView, type InviteRow } from './widgets/invites-view';

export const dynamic = 'force-dynamic';

const PAGE_LIMIT = 500;

/**
 * Invites page — the operational surface for member invitations. Each
 * imported member surfaces here with their current claim status, last
 * invite dispatch, resent count, and any Auth admin API error.
 *
 * Filters (client-side):
 *   - By batch — every member has a batch_scope_id.
 *   - By claim status (invited / claimed / not_invited / disabled).
 *   - By error state — quickly focus on the failed invites.
 *
 * Row action: Resend — fires the same members/send-invite flow that the
 * import confirm uses. Idempotent; safe to spam.
 *
 * Access: RLS on core.member_accounts admits any user holding
 * member.import at any scope (see 20260705150000).
 */
export default async function InvitesPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/exco/invites');

  const { data: accounts } = await supabase
    .schema('core')
    .from('member_accounts')
    .select(
      'id, member_id, auth_user_id, claim_status, invited_at, claimed_at, last_invitation_sent_at, resent_count, invite_error, created_at',
    )
    .order('last_invitation_sent_at', { ascending: false, nullsFirst: false })
    .limit(PAGE_LIMIT);

  const accountList = accounts ?? [];
  const memberIds = Array.from(new Set(accountList.map((a) => a.member_id)));

  const { data: members } = memberIds.length
    ? await supabase
        .schema('core')
        .from('members')
        .select('id, full_name, email, phone, batch_scope_id, member_code')
        .in('id', memberIds)
    : {
        data: [] as Array<{
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          batch_scope_id: string;
          member_code: string;
        }>,
      };
  const memberById = new Map((members ?? []).map((m) => [m.id, m]));

  const batchIds = Array.from(new Set((members ?? []).map((m) => m.batch_scope_id)));
  const { data: batches } = batchIds.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, slug, entry_year')
        .in('id', batchIds)
    : { data: [] as Array<{ id: string; name: string; slug: string; entry_year: number | null }> };
  const batchById = new Map((batches ?? []).map((b) => [b.id, b]));

  const rows: InviteRow[] = accountList.map((a) => {
    const m = memberById.get(a.member_id);
    const batch = m ? batchById.get(m.batch_scope_id) : undefined;
    return {
      accountId: a.id,
      memberId: a.member_id,
      memberCode: m?.member_code ?? null,
      fullName: m?.full_name ?? '(missing member)',
      email: m?.email ?? null,
      phone: m?.phone ?? null,
      batchName: batch?.name ?? null,
      batchSlug: batch?.slug ?? null,
      claimStatus: a.claim_status as InviteRow['claimStatus'],
      invitedAt: a.invited_at,
      claimedAt: a.claimed_at,
      lastSentAt: a.last_invitation_sent_at,
      resentCount: a.resent_count ?? 0,
      inviteError: a.invite_error,
      createdAt: a.created_at,
    };
  });

  return <InvitesView rows={rows} limit={PAGE_LIMIT} />;
}
