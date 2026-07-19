import { notFound } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import { StatementView } from './widgets/statement-view';
import type { Entry, Period, StatementSummary } from './widgets/statement-types';

export const dynamic = 'force-dynamic';

interface PageProps {
  readonly params: Promise<{ slug: string }>;
  readonly searchParams: Promise<{ period?: string }>;
}

interface ScopeRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly scope_type: string;
  readonly currency_code: string;
}

interface TreasuryBalanceRow {
  readonly scope_id: string;
  readonly balance: string;
  readonly currency: string;
  readonly updated_at: string;
}

interface StatementRow {
  readonly scope_id: string;
  readonly currency: string;
  readonly opening_balance: string;
  readonly income_sum: string;
  readonly expense_sum: string;
  readonly closing_balance: string;
}

interface RawEntry {
  readonly id: string;
  readonly journal_id: string;
  readonly direction: string;
  readonly amount: string;
  readonly currency: string;
  readonly payment_id: string | null;
  readonly expense_id: string | null;
  readonly memo: string | null;
  readonly created_at: string;
}

interface RawPayment {
  readonly id: string;
  readonly payer_member_id: string | null;
  readonly charge_id: string | null;
  readonly method: string;
  readonly source: string;
  readonly reverses_payment_id: string | null;
  readonly metadata: Record<string, unknown> | null;
}

interface RawExpense {
  readonly id: string;
  readonly payee: string;
  readonly category_id: string | null;
  readonly reverses_expense_id: string | null;
}

interface RawCharge {
  readonly id: string;
  readonly name: string;
}

interface RawMember {
  readonly id: string;
  readonly full_name: string;
}

interface RawCategory {
  readonly id: string;
  readonly name: string;
}

const VALID_PERIODS: readonly Period[] = ['30d', '90d', 'mtd', 'ytd', 'all'];

function resolvePeriod(raw: string | undefined): Period {
  return VALID_PERIODS.includes(raw as Period) ? (raw as Period) : '30d';
}

function windowFor(period: Period): { from: Date | null; to: Date } {
  const to = new Date();
  const from = new Date();
  switch (period) {
    case '30d':
      from.setDate(from.getDate() - 30);
      return { from, to };
    case '90d':
      from.setDate(from.getDate() - 90);
      return { from, to };
    case 'mtd':
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    case 'ytd':
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    case 'all':
      return { from: null, to };
  }
}

/**
 * Treasury Statement — opening + income + expenses + closing for a
 * scope, plus the individual ledger movements that produced it.
 *
 * Summary numbers come from finance.get_treasury_statement (permission-
 * gated on treasury.read at the scope). The movements table joins
 * ledger_entries → payments/expenses so each row shows what settled —
 * which payer, which charge, or which payee.
 */
export default async function TreasuryStatementPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { period: periodRaw } = await searchParams;
  const period = resolvePeriod(periodRaw);
  const { from, to } = windowFor(period);

  const supabase = await getServerClient();

  const { data: scopeRaw } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, name, slug, scope_type, currency_code')
    .eq('slug', slug)
    .maybeSingle();
  const scope = scopeRaw as ScopeRow | null;
  if (!scope) notFound();

  const [{ data: balanceRaw }, { data: summaryRaw, error: summaryErr }] = await Promise.all([
    supabase
      .schema('finance' as never)
      .from('treasury_balances' as never)
      .select('scope_id, balance, currency, updated_at')
      .eq('scope_id', scope.id)
      .maybeSingle(),
    supabase.schema('finance' as never).rpc(
      'get_treasury_statement' as never,
      {
        p_scope_id: scope.id,
        p_from: from ? from.toISOString() : null,
        p_to: to.toISOString(),
      } as never,
    ),
  ]);

  if (summaryErr) {
    // 42501 → treasury.read denied at this scope. Same UX as any other
    // permission miss: 404 rather than 403, since the caller has no
    // read grant at this scope at all.
    notFound();
  }

  const balance = balanceRaw as TreasuryBalanceRow | null;
  const summaryRow =
    (Array.isArray(summaryRaw) ? (summaryRaw[0] as StatementRow | undefined) : null) ?? null;

  const summary: StatementSummary = {
    currency: summaryRow?.currency ?? balance?.currency ?? scope.currency_code,
    opening: summaryRow ? parseFloat(summaryRow.opening_balance) : 0,
    income: summaryRow ? parseFloat(summaryRow.income_sum) : 0,
    expenses: summaryRow ? parseFloat(summaryRow.expense_sum) : 0,
    closing: summaryRow ? parseFloat(summaryRow.closing_balance) : 0,
    liveBalance: balance ? parseFloat(balance.balance) : 0,
    liveUpdatedAt: balance?.updated_at ?? null,
    windowFrom: from ? from.toISOString() : null,
    windowTo: to.toISOString(),
  };

  // Load ledger entries in the window.
  let entriesQuery = supabase
    .schema('finance' as never)
    .from('ledger_entries' as never)
    .select('id, journal_id, direction, amount, currency, payment_id, expense_id, memo, created_at')
    .eq('scope_id', scope.id)
    .order('created_at', { ascending: false })
    .limit(500);
  if (from) entriesQuery = entriesQuery.gte('created_at', from.toISOString());
  entriesQuery = entriesQuery.lte('created_at', to.toISOString());

  const { data: entriesRaw } = await entriesQuery;
  const entries = (entriesRaw ?? []) as RawEntry[];

  const paymentIds = Array.from(
    new Set(entries.map((e) => e.payment_id).filter((x): x is string => !!x)),
  );
  const expenseIds = Array.from(
    new Set(entries.map((e) => e.expense_id).filter((x): x is string => !!x)),
  );

  const [{ data: paymentsRaw }, { data: expensesRaw }] = await Promise.all([
    paymentIds.length
      ? supabase
          .schema('finance' as never)
          .from('payments' as never)
          .select('id, payer_member_id, charge_id, method, source, reverses_payment_id, metadata')
          .in('id', paymentIds)
      : Promise.resolve({ data: [] as RawPayment[] }),
    expenseIds.length
      ? supabase
          .schema('finance' as never)
          .from('expenses' as never)
          .select('id, payee, category_id, reverses_expense_id')
          .in('id', expenseIds)
      : Promise.resolve({ data: [] as RawExpense[] }),
  ]);
  const payments = (paymentsRaw ?? []) as RawPayment[];
  const expenses = (expensesRaw ?? []) as RawExpense[];

  const chargeIds = Array.from(
    new Set(payments.map((p) => p.charge_id).filter((x): x is string => !!x)),
  );
  const memberIds = Array.from(
    new Set(payments.map((p) => p.payer_member_id).filter((x): x is string => !!x)),
  );
  const categoryIds = Array.from(
    new Set(expenses.map((e) => e.category_id).filter((x): x is string => !!x)),
  );

  const [{ data: chargeRows }, { data: memberRows }, { data: categoryRows }] = await Promise.all([
    chargeIds.length
      ? supabase
          .schema('finance' as never)
          .from('charges' as never)
          .select('id, name')
          .in('id', chargeIds)
      : Promise.resolve({ data: [] as RawCharge[] }),
    memberIds.length
      ? supabase.schema('core').from('members').select('id, full_name').in('id', memberIds)
      : Promise.resolve({ data: [] as RawMember[] }),
    categoryIds.length
      ? supabase
          .schema('finance' as never)
          .from('expense_categories' as never)
          .select('id, name')
          .in('id', categoryIds)
      : Promise.resolve({ data: [] as RawCategory[] }),
  ]);
  const chargeById = new Map(((chargeRows ?? []) as RawCharge[]).map((c) => [c.id, c.name]));
  const memberById = new Map(((memberRows ?? []) as RawMember[]).map((m) => [m.id, m.full_name]));
  const categoryById = new Map(((categoryRows ?? []) as RawCategory[]).map((c) => [c.id, c.name]));
  const paymentById = new Map(payments.map((p) => [p.id, p]));
  const expenseById = new Map(expenses.map((e) => [e.id, e]));

  const parsedEntries: Entry[] = entries.map((e) => {
    const payment = e.payment_id ? paymentById.get(e.payment_id) : null;
    const expense = e.expense_id ? expenseById.get(e.expense_id) : null;
    let counterparty = '';
    let subtitle = '';
    let isReversal = false;

    if (payment) {
      const meta = (payment.metadata ?? {}) as {
        donor_name?: string;
        public_donation?: boolean;
      };
      const donorLabel = meta.donor_name ?? (meta.public_donation ? 'Anonymous donor' : null);
      counterparty =
        (payment.payer_member_id ? memberById.get(payment.payer_member_id) : null) ??
        donorLabel ??
        'Payment';
      subtitle = payment.charge_id ? (chargeById.get(payment.charge_id) ?? '') : '';
      isReversal = !!payment.reverses_payment_id;
    } else if (expense) {
      counterparty = expense.payee;
      subtitle = expense.category_id ? (categoryById.get(expense.category_id) ?? '') : '';
      isReversal = !!expense.reverses_expense_id;
    }

    return {
      id: e.id,
      createdAt: e.created_at,
      direction: e.direction as 'income' | 'expense',
      amount: parseFloat(e.amount),
      currency: e.currency,
      counterparty,
      subtitle,
      memo: e.memo,
      sourceKind: payment ? 'payment' : expense ? 'expense' : 'other',
      sourceMethod: payment?.method ?? null,
      sourceLabel: payment ? formatSource(payment.source) : null,
      isReversal,
    };
  });

  return (
    <StatementView
      scopeName={scope.name}
      scopeType={scope.scope_type}
      scopeSlug={scope.slug}
      period={period}
      summary={summary}
      entries={parsedEntries}
    />
  );
}

function formatSource(source: string): string {
  return source === 'auto' ? 'Auto' : 'Manual';
}
