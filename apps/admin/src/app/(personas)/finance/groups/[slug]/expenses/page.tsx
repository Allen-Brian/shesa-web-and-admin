import { notFound } from 'next/navigation';

import { loadGroupBySlug } from '@/lib/finance/groups/load-group';
import { getServerClient } from '@/lib/supabase-server';

import { ExpensesView } from '../../../expenses/widgets/expenses-view';
import type {
  CategoryOption,
  ExpenseRow,
  GroupOption,
  ScopeOption,
} from '../../../expenses/widgets/expenses-types';

export const dynamic = 'force-dynamic';

interface Props {
  readonly params: Promise<{ slug: string }>;
}

interface RawExpense {
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
}

interface RawCategory {
  readonly id: string;
  readonly key: string;
  readonly name: string;
}

interface RawSetting {
  readonly scope_id: string;
  readonly approval_threshold_amount: string | null;
}

/**
 * Group expenses — same view + filters + record dialog as mainstream,
 * but scoped to `group_id = <this group>`. The record dialog picks the
 * owner scope from mainstream + branches the caller can see; the new
 * row picks up `group_id` via the payments/expenses inherit trigger
 * when the expense is booked against a group-owned charge.
 */
export default async function GroupExpensesPage({ params }: Props) {
  const { slug } = await params;
  const group = await loadGroupBySlug(slug);
  if (!group) notFound();

  const supabase = await getServerClient();
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
        'id, scope_id, category_id, payee, amount, currency, description, status, reverses_expense_id, incurred_at, created_at',
      )
      .eq('group_id', group.id)
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

  const expensesData = (expensesRaw ?? []) as RawExpense[];
  const categoriesData = (categoriesRaw ?? []) as RawCategory[];
  const settingsData = (settingsRaw ?? []) as RawSetting[];

  const scopeSet = new Set<string>([
    ...((treasuriesRaw ?? []) as Array<{ scope_id: string }>).map((t) => t.scope_id),
    ...expensesData.map((e) => e.scope_id),
  ]);
  const { data: scopeRows } = scopeSet.size
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, scope_type, chapter_kind, currency_code')
        .in('id', Array.from(scopeSet))
    : {
        data: [] as Array<{
          id: string;
          name: string;
          scope_type: string;
          chapter_kind: string | null;
          currency_code: string;
        }>,
      };
  const scopesData = (scopeRows ?? []) as Array<{
    id: string;
    name: string;
    scope_type: string;
    chapter_kind: string | null;
    currency_code: string;
  }>;
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
      groupId: group.id,
      groupName: group.name,
    };
  });

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

  // Only this group appears in the Group filter — no cross-group
  // narrowing makes sense inside a group lens.
  const groupOptions: GroupOption[] = [{ id: group.id, name: group.name }];

  return (
    <ExpensesView
      expenses={expenses}
      scopeOptions={scopeOptions}
      categoryOptions={categoryOptions}
      groupOptions={groupOptions}
    />
  );
}
