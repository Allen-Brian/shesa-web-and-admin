import { notFound } from 'next/navigation';

import { StatsCard } from '@shesa/ui';

import { formatCompactMoney } from '@/lib/finance/format-money';
import { loadGroupBySlug } from '@/lib/finance/groups/load-group';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface GroupDashboardProps {
  readonly params: Promise<{ slug: string }>;
}

interface RawPayment {
  readonly amount: number;
  readonly currency: string;
  readonly reverses_payment_id: string | null;
}

interface RawExpense {
  readonly amount: number;
  readonly currency: string;
  readonly reverses_expense_id: string | null;
  readonly status: string;
}

/**
 * Group dashboard — Income / Expenses / Net + transaction and
 * contribution counts, all scoped to `group_id = <this group>`. Sums
 * are single-currency by construction (a group lives at mainstream, and
 * the mainstream scope has one currency) but we fall back to XAF for
 * display when the ledger is empty.
 */
export default async function GroupDashboardPage({ params }: GroupDashboardProps) {
  const { slug } = await params;
  const group = await loadGroupBySlug(slug);
  if (!group) notFound();

  const supabase = await getServerClient();
  const [{ data: paymentsRaw }, { data: expensesRaw }, { count: chargeCount }] = await Promise.all([
    supabase
      .schema('finance')
      .from('payments')
      .select('amount, currency, reverses_payment_id')
      .eq('group_id', group.id)
      .limit(5000),
    supabase
      .schema('finance')
      .from('expenses')
      .select('amount, currency, reverses_expense_id, status')
      .eq('group_id', group.id)
      .limit(5000),
    supabase
      .schema('finance')
      .from('charges')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', group.id),
  ]);

  const payments = (paymentsRaw ?? []) as RawPayment[];
  const expenses = (expensesRaw ?? []) as RawExpense[];

  let income = 0;
  let currency: string | null = null;
  let txnCount = 0;
  for (const p of payments) {
    const amt = p.amount;
    const signed = p.reverses_payment_id ? -amt : amt;
    income += signed;
    txnCount += 1;
    currency ??= p.currency;
  }

  let expenseSum = 0;
  for (const e of expenses) {
    if (e.status !== 'approved' && e.status !== 'recorded') continue;
    const amt = e.amount;
    const signed = e.reverses_expense_id ? -amt : amt;
    expenseSum += signed;
    currency ??= e.currency;
  }

  const net = income - expenseSum;
  const displayCurrency = currency ?? 'XAF';

  return (
    <section className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard label="Income" value={formatCompactMoney(income, displayCurrency)} />
        <StatsCard label="Expenses" value={formatCompactMoney(expenseSum, displayCurrency)} />
        <StatsCard label="Net" value={formatCompactMoney(net, displayCurrency)} />
        <StatsCard label="Charges" value={(chargeCount ?? 0).toLocaleString()} />
        <StatsCard label="Transactions" value={txnCount.toLocaleString()} />
      </div>
      <p className="text-xs text-muted-foreground">
        Every row above stays visible in the mainstream ledger — the group is a lens, not a silo.
      </p>
    </section>
  );
}
