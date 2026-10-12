import { redirect } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import { GroupsView } from './widgets/groups-view';
import type { GroupRow, GroupStatus } from './widgets/groups-types';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Event Groups' };

interface RawGroup {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: GroupStatus;
  readonly show_in_sidebar: boolean;
  readonly starts_on: string | null;
  readonly ends_on: string | null;
  readonly created_at: string;
  readonly scope_id: string;
}

interface RawCharge {
  readonly id: string;
  readonly group_id: string;
  readonly currency: string;
}

interface RawPayment {
  readonly amount: number;
  readonly group_id: string | null;
  readonly reverses_payment_id: string | null;
}

interface RawExpense {
  readonly group_id: string | null;
}

interface RawMainstream {
  readonly currency_code: string;
}

/**
 * Groups admin — one row per event group with roll-up counts +
 * lifecycle chips. Roll-ups (raised, transaction count, expense
 * count, charge count) are cheap client-side aggregates over one
 * IN-list query per table; if the group count grows past a few
 * hundred we'll swap to a materialised view.
 */
export default async function GroupsPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/finance/groups');

  const { data: groupsRaw } = await supabase
    .schema('finance')
    .from('groups')
    .select(
      'id, slug, name, description, status, show_in_sidebar, starts_on, ends_on, created_at, scope_id',
    )
    .order('created_at', { ascending: false });

  const groups = (groupsRaw ?? []) as RawGroup[];
  const groupIds = groups.map((g) => g.id);

  const [
    { data: chargesRaw },
    { data: paymentsRaw },
    { data: expensesRaw },
    { data: mainstreamRaw },
  ] = await Promise.all([
    groupIds.length
      ? supabase
          .schema('finance')
          .from('charges')
          .select('id, group_id, currency')
          .in('group_id', groupIds)
      : Promise.resolve({ data: [] as RawCharge[] }),
    groupIds.length
      ? supabase
          .schema('finance')
          .from('payments')
          .select('amount, group_id, reverses_payment_id')
          .in('group_id', groupIds)
          .limit(5000)
      : Promise.resolve({ data: [] as RawPayment[] }),
    groupIds.length
      ? supabase.schema('finance').from('expenses').select('group_id').in('group_id', groupIds)
      : Promise.resolve({ data: [] as RawExpense[] }),
    supabase
      .schema('core')
      .from('scopes')
      .select('currency_code')
      .eq('scope_type', 'mainstream')
      .maybeSingle(),
  ]);

  const charges = (chargesRaw ?? []) as RawCharge[];
  const payments = (paymentsRaw ?? []) as RawPayment[];
  const expenses = (expensesRaw ?? []) as RawExpense[];
  const mainstreamCurrency = (mainstreamRaw as RawMainstream | null)?.currency_code ?? 'XAF';

  const chargeCountByGroup = new Map<string, number>();
  const currencyByGroup = new Map<string, string>();
  for (const c of charges) {
    chargeCountByGroup.set(c.group_id, (chargeCountByGroup.get(c.group_id) ?? 0) + 1);
    if (!currencyByGroup.has(c.group_id)) currencyByGroup.set(c.group_id, c.currency);
  }

  const raisedByGroup = new Map<string, number>();
  const txnCountByGroup = new Map<string, number>();
  for (const p of payments) {
    if (!p.group_id) continue;
    const amt = p.amount;
    const signed = p.reverses_payment_id ? -amt : amt;
    raisedByGroup.set(p.group_id, (raisedByGroup.get(p.group_id) ?? 0) + signed);
    txnCountByGroup.set(p.group_id, (txnCountByGroup.get(p.group_id) ?? 0) + 1);
  }

  const expenseCountByGroup = new Map<string, number>();
  for (const e of expenses) {
    if (!e.group_id) continue;
    expenseCountByGroup.set(e.group_id, (expenseCountByGroup.get(e.group_id) ?? 0) + 1);
  }

  const rows: GroupRow[] = groups.map((g) => ({
    id: g.id,
    slug: g.slug,
    name: g.name,
    description: g.description,
    status: g.status,
    showInSidebar: g.show_in_sidebar,
    startsOn: g.starts_on,
    endsOn: g.ends_on,
    createdAt: g.created_at,
    chargeCount: chargeCountByGroup.get(g.id) ?? 0,
    transactionCount: txnCountByGroup.get(g.id) ?? 0,
    expenseCount: expenseCountByGroup.get(g.id) ?? 0,
    raised: Math.max(0, raisedByGroup.get(g.id) ?? 0),
    currency: currencyByGroup.get(g.id) ?? mainstreamCurrency,
  }));

  return <GroupsView groups={rows} />;
}
