import { redirect } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import { ReportsView, type ScopeOption } from './widgets/reports-view';

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
 * The two per-entity reports (contribution_progress and member_statement)
 * surface on their owning pages instead — contribution_progress shows
 * inline on the Contributions list, and member_statement will land on
 * the member profile in a follow-up.
 */
export default async function ReportsPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/finance/reports');

  const { data: treasuriesRaw } = await supabase
    .schema('finance' as never)
    .from('treasury_balances' as never)
    .select('scope_id');

  const scopeIds = Array.from(
    new Set(((treasuriesRaw ?? []) as Array<{ scope_id: string }>).map((t) => t.scope_id)),
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

  return <ReportsView scopeOptions={scopeOptions} />;
}
