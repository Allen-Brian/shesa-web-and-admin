import { redirect } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import { ExpensesView } from './widgets/expenses-view';
import type {
  CategoryOption,
  ExpenseRow,
  GroupOption,
  ScopeOption,
} from './widgets/expenses-types';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Expenses' };

interface RawExpenseRow {
  readonly id: string;
  readonly scope_id: string;
  readonly category_id: string | null;
  readonly payee: string;
  readonly amount: number;
  readonly currency: string;
  readonly description: string | null;
  readonly status: string;
  readonly reverses_expense_id: string | null;
  readonly incurred_at: string;
  readonly created_at: string;
  readonly group_id: string | null;
}

interface RawGroupRow {
  readonly id: string;
  readonly name: string;
}

interface RawScopeRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly scope_type: string;
  readonly chapter_kind: string | null;
  readonly currency_code: string;
}

interface RawCategoryRow {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly sort_order: number;
  readonly is_active: boolean;
}

interface RawSettingsRow {
  readonly scope_id: string;
  readonly approval_threshold_amount: string | null;
  readonly approval_threshold_currency: string | null;
}

/**
 * Expenses page — money out of a treasury.
 *
 * The threshold gate lives on the /expenses/record edge fn (M7): below
 * settings.approval_threshold_amount → status='recorded' (hits ledger
 * immediately); at or above → status='pending_approval' (Admin approves
 * via expenses/approve to write the ledger).
 *
 * Reversals fire the M7 UPDATE trigger which writes a direction='income'
 * ledger row that cancels out the original outflow.
 */
export default async function ExpensesPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/finance/expenses');

  const [
    { data: expensesRaw },
    { data: treasuriesRaw },
    { data: categoriesRaw },
    { data: settingsRaw },
  ] = await Promise.all([
    supabase
      .schema('finance')
      .from('expenses')
      .select(
        'id, scope_id, category_id, payee, amount, currency, description, status, reverses_expense_id, incurred_at, created_at, group_id',
      )
      .order('incurred_at', { ascending: false })
      .limit(500),
    supabase.schema('finance').from('treasury_balances').select('scope_id'),
    supabase
      .schema('finance')
      .from('expense_categories')
      .select('id, key, name, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .schema('finance')
      .from('expense_settings')
      .select('scope_id, approval_threshold_amount, approval_threshold_currency'),
  ]);

  const expensesData = (expensesRaw ?? []) as RawExpenseRow[];
  const categoriesData = (categoriesRaw ?? []) as RawCategoryRow[];
  const settingsData = (settingsRaw ?? []) as RawSettingsRow[];

  // Groups any expense hangs off (via inherited group_id from its
  // parent charge, or direct assignment). One IN-list query — the
  // chip renders in the payee cell and the filter picker below the
  // KPI strip.
  const groupIds = Array.from(
    new Set(expensesData.map((e) => e.group_id).filter((id): id is string => !!id)),
  );
  const { data: groupsRaw } = groupIds.length
    ? await supabase.schema('finance').from('groups').select('id, name').in('id', groupIds)
    : { data: [] as RawGroupRow[] };
  const groupsData = (groupsRaw ?? []) as RawGroupRow[];
  const groupById = new Map(groupsData.map((g) => [g.id, g] as const));

  const scopeSet = new Set<string>([
    ...((treasuriesRaw ?? []) as Array<{ scope_id: string }>).map((t) => t.scope_id),
    ...expensesData.map((e) => e.scope_id),
  ]);
  const { data: scopeRows } = scopeSet.size
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, slug, scope_type, chapter_kind, currency_code')
        .in('id', Array.from(scopeSet))
    : { data: [] as RawScopeRow[] };
  const scopesData = (scopeRows ?? []) as RawScopeRow[];
  const scopeById = new Map(scopesData.map((s) => [s.id, s]));
  const categoryById = new Map(categoriesData.map((c) => [c.id, c]));

  const reversedIds = new Set(
    expensesData.map((e) => e.reverses_expense_id).filter((id): id is string => !!id),
  );

  const expenses: ExpenseRow[] = expensesData.map((e) => {
    const scope = scopeById.get(e.scope_id);
    const category = e.category_id ? categoryById.get(e.category_id) : null;
    return {
      id: e.id,
      scopeId: e.scope_id,
      scopeName: scope?.name ?? '(unknown)',
      categoryKey: category?.key ?? null,
      categoryName: category?.name ?? null,
      payee: e.payee,
      amount: e.amount,
      currency: e.currency,
      description: e.description,
      status: e.status,
      reversesExpenseId: e.reverses_expense_id,
      isReversed: reversedIds.has(e.id),
      incurredAt: e.incurred_at,
      createdAt: e.created_at,
      groupId: e.group_id,
      groupName: e.group_id ? (groupById.get(e.group_id)?.name ?? null) : null,
    };
  });

  const groupOptions: GroupOption[] = groupsData
    .map((g) => ({ id: g.id, name: g.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const scopeOptions: ScopeOption[] = scopesData
    .filter(
      (s) =>
        s.scope_type === 'mainstream' ||
        s.scope_type === 'branch' ||
        (s.scope_type === 'chapter' && s.chapter_kind === 'autonomous'),
    )
    .map((s) => {
      const setting = settingsData.find((st) => st.scope_id === s.id);
      return {
        id: s.id,
        name: s.name,
        currency: s.currency_code,
        threshold: setting?.approval_threshold_amount
          ? parseFloat(setting.approval_threshold_amount)
          : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const categoryOptions: CategoryOption[] = categoriesData.map((c) => ({
    id: c.id,
    key: c.key,
    name: c.name,
  }));

  return (
    <ExpensesView
      expenses={expenses}
      scopeOptions={scopeOptions}
      categoryOptions={categoryOptions}
      groupOptions={groupOptions}
    />
  );
}
