import type { getServerClient } from '@/lib/supabase-server';

import type {
  DashboardRawData,
  RawAnnouncement,
  RawBranch,
  RawCharge,
  RawEvent,
  RawMember,
  RawMembership,
  RawObligation,
  RawPayment,
  RawScope,
} from './dashboard-loader-types';

type ServerClient = Awaited<ReturnType<typeof getServerClient>>;

/**
 * Fan-out the 9 queries the exco dashboard needs. One Promise.all so
 * the page hits the DB in a single flight. Each shape is typed via a
 * Raw* interface — we cast the anonymous Supabase rows once here so
 * downstream code stays typed without repeating `as never`.
 *
 * `events` / `announcements` / `charges` / `obligations` / `payments`
 * live under Phase-3 schemas that aren't in the generated types yet —
 * the `as never` cast keeps supabase-js happy until the codegen runs.
 */
export async function loadDashboardRawData(supabase: ServerClient): Promise<DashboardRawData> {
  const [
    { data: scopesRaw },
    { data: branchesRaw },
    { data: membersRaw },
    { data: membershipsRaw },
    { data: eventsRaw },
    { data: announcementsRaw },
    { data: chargesRaw },
    { data: obligationsRaw },
    { data: paymentsRaw },
  ] = await Promise.all([
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, slug, scope_type, chapter_kind, parent_scope_id'),
    supabase.schema('core').from('branches').select('scope_id, city, region, country_code'),
    supabase
      .schema('core')
      .from('members')
      .select(
        'id, full_name, current_city, current_country, created_at, network_scope_id, house_scope_id',
      ),
    supabase
      .schema('core')
      .from('memberships')
      .select('member_id, scope_id, membership_status, engagement, joined_at')
      .in('membership_status', ['active', 'passive', 'pending']),
    supabase
      .schema('exco')
      .from('events')
      .select('id, owner_scope_id, name, start_at, end_at, venue_name, online_url, types, status')
      .in('status', ['published', 'scheduled'])
      .order('start_at', { ascending: true })
      .limit(50),
    supabase
      .schema('exco')
      .from('announcements')
      .select('id, owner_scope_id, title, body, published_at, status')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(20),
    supabase
      .schema('finance')
      .from('charges')
      .select(
        'id, scope_id, name, shape, base_amount, goal_amount, currency, status, lifecycle, close_date, recurrence',
      ),
    supabase
      .schema('finance')
      .from('obligations')
      .select('id, charge_id, scope_id, amount, currency, status, period_start'),
    supabase
      .schema('finance')
      .from('payments')
      .select(
        'id, charge_id, obligation_id, scope_id, payer_member_id, amount, currency, method, source, reverses_payment_id, created_at, metadata',
      )
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  return {
    scopes: (scopesRaw ?? []) as RawScope[],
    branches: (branchesRaw ?? []) as RawBranch[],
    members: (membersRaw ?? []) as RawMember[],
    memberships: (membershipsRaw ?? []) as RawMembership[],
    events: (eventsRaw ?? []) as RawEvent[],
    announcements: (announcementsRaw ?? []) as RawAnnouncement[],
    charges: (chargesRaw ?? []) as RawCharge[],
    obligations: (obligationsRaw ?? []) as RawObligation[],
    payments: (paymentsRaw ?? []) as RawPayment[],
  };
}
