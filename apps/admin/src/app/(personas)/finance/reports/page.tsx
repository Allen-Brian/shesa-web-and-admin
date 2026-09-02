import { redirect } from 'next/navigation';

import { activeFinanceScope } from '@/lib/finance/active-scope';
import { getServerClient } from '@/lib/supabase-server';

import { ReportsView } from './widgets/reports-view';
import type { GroupOption, ScopeOption } from './widgets/reports-types';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Reports' };

interface RawScopeRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly scope_type: string;
  readonly chapter_kind: string | null;
  readonly currency_code: string;
}

interface RawGroup {
  readonly id: string;
  readonly name: string;
  readonly status: string;
}

interface RawCharge {
  readonly id: string;
  readonly group_id: string;
}

/**
 * Reports page — picker + rendered table for each of the six
 * scope-based DB report functions (M9 + M11):
 *
 *   collections               — money in per charge over a period
 *   arrears                   — outstanding obligations per member
 *   treasury_statement        — opening / income / expense / closing
 *   payment_method_breakdown  — sum by method
 *   expense_report_by_category — sum by category
 *   donation_report           — freewill income per campaign
 *
 * The scope picker is narrowed by `activeFinanceScope`: mainstream
 * users see only the mainstream scope (never a rollup of branches);
 * branch users see the scopes they hold `finance` at.
 *
 * The optional Group picker narrows already-returned rows by charge —
 * the report RPCs stay scope-native and don't grow a group_id param
 * (per the module plan's non-goal); the client filter is enough for
 * every report that carries a `charge_id` in its rows.
 */
export default async function ReportsPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/finance/reports');

  const active = await activeFinanceScope(user.id);
  const allowedScopeIds = active?.scopeIds ?? [];

  const { data: treasuriesRaw } = await supabase
    .schema('finance')
    .from('treasury_balances')
    .select('scope_id');

  const treasuryScopeIds = ((treasuriesRaw ?? []) as Array<{ scope_id: string }>).map(
    (t) => t.scope_id,
  );
  // Intersect the treasury-visible set with the active scope: RLS lets
  // mainstream users see every treasury but the reports picker must
  // stay mainstream-only.
  const scopeIds = Array.from(
    new Set(treasuryScopeIds.filter((id) => allowedScopeIds.includes(id))),
  );

  const { data: scopeRows } = scopeIds.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, slug, scope_type, chapter_kind, currency_code')
        .in('id', scopeIds)
    : { data: [] as RawScopeRow[] };

  const scopeOptions: ScopeOption[] = ((scopeRows ?? []) as RawScopeRow[])
    .filter(
      (s) =>
        s.scope_type === 'mainstream' ||
        s.scope_type === 'branch' ||
        (s.scope_type === 'chapter' && s.chapter_kind === 'autonomous'),
    )
    .map((s) => ({
      id: s.id,
      name: s.name,
      currency: s.currency_code,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Groups + their charges. Reports narrow to a group by intersecting
  // returned rows' charge_id with this list, so we ship the map to the
  // client once.
  const { data: groupsRaw } = await supabase
    .schema('finance')
    .from('groups')
    .select('id, name, status')
    .in('status', ['active', 'closed'])
    .order('name');
  const groupsData = (groupsRaw ?? []) as RawGroup[];
  const groupIds = groupsData.map((g) => g.id);

  const { data: chargesRaw } = groupIds.length
    ? await supabase
        .schema('finance')
        .from('charges')
        .select('id, group_id')
        .in('group_id', groupIds)
    : { data: [] as RawCharge[] };
  const chargesByGroup = new Map<string, string[]>();
  for (const c of (chargesRaw ?? []) as RawCharge[]) {
    const bucket = chargesByGroup.get(c.group_id) ?? [];
    bucket.push(c.id);
    chargesByGroup.set(c.group_id, bucket);
  }

  const groupOptions: GroupOption[] = groupsData.map((g) => ({
    id: g.id,
    name: g.name,
    chargeIds: chargesByGroup.get(g.id) ?? [],
  }));

  return <ReportsView scopeOptions={scopeOptions} groupOptions={groupOptions} />;
}
