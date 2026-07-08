import { Wallet } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import { getServerClient } from '@/lib/supabase-server';

import {
  TreasuryLandingView,
  type RecentEntry,
  type TreasuryEntry,
} from './widgets/treasury-landing-view';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Treasury' };

interface RawTreasury {
  readonly scope_id: string;
  readonly balance: string;
  readonly currency: string;
  readonly updated_at: string;
}

interface RawScope {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly scope_type: string;
}

interface RawLedgerEntry {
  readonly id: string;
  readonly scope_id: string;
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
  readonly metadata: Record<string, unknown> | null;
  readonly reverses_payment_id: string | null;
}

interface RawExpense {
  readonly id: string;
  readonly payee: string;
  readonly reverses_expense_id: string | null;
}

interface RawMember {
  readonly id: string;
  readonly full_name: string;
}

const THIRTY_DAY_MS = 30 * 24 * 60 * 60 * 1000;
const RECENT_FEED_LIMIT = 12;

/**
 * Treasury landing — one card per scope the finance user can see. Cards
 * show current balance, currency, freshness, and a 30-day net-flow
 * signal (income − expenses over the last thirty days) so operators
 * can spot a scope that has stopped receiving payments before drilling
 * in.
 *
 * A compact recent-activity feed lives below the grid, joining the
 * last ~12 ledger movements across every visible treasury. Enough to
 * catch the "what happened this morning?" scan without opening every
 * statement.
 *
 * All interactivity (search, sort, feed filter) lives in the Client
 * widget so the loader stays a straightforward server render.
 */
export default async function TreasuryPage() {
  const supabase = await getServerClient();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAY_MS);

  const [{ data: treasuriesRaw }, { data: entriesRaw }] = await Promise.all([
    supabase
      .schema('finance' as never)
      .from('treasury_balances' as never)
      .select('scope_id, balance, currency, updated_at'),
    supabase
      .schema('finance' as never)
      .from('ledger_entries' as never)
      .select('id, scope_id, direction, amount, currency, payment_id, expense_id, memo, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false }),
  ]);

  const treasuries = (treasuriesRaw ?? []) as RawTreasury[];
  const entries = (entriesRaw ?? []) as RawLedgerEntry[];

  const scopeIds = Array.from(new Set(treasuries.map((t) => t.scope_id)));
  const { data: scopeRows } = scopeIds.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, slug, scope_type')
        .in('id', scopeIds)
    : { data: [] as RawScope[] };
  const scopeById = new Map(((scopeRows ?? []) as RawScope[]).map((s) => [s.id, s]));

  // 30-day net flow per treasury. Income adds, expense subtracts.
  const flowByScope = new Map<string, { income: number; expenses: number; count: number }>();
  for (const e of entries) {
    const amt = parseFloat(e.amount);
    const bucket = flowByScope.get(e.scope_id) ?? { income: 0, expenses: 0, count: 0 };
    if (e.direction === 'income') bucket.income += amt;
    else if (e.direction === 'expense') bucket.expenses += amt;
    bucket.count += 1;
    flowByScope.set(e.scope_id, bucket);
  }

  const treasuriesOut: TreasuryEntry[] = treasuries.map((t) => {
    const scope = scopeById.get(t.scope_id);
    const flow = flowByScope.get(t.scope_id) ?? { income: 0, expenses: 0, count: 0 };
    const balance = parseFloat(t.balance);
    return {
      scopeId: t.scope_id,
      scopeSlug: scope?.slug ?? '',
      scopeName: scope?.name ?? '(unknown scope)',
      scopeType: scope?.scope_type ?? 'other',
      balance,
      currency: t.currency,
      updatedAt: t.updated_at,
      thirtyDayIncome: flow.income,
      thirtyDayExpenses: flow.expenses,
      thirtyDayNet: flow.income - flow.expenses,
      thirtyDayEntryCount: flow.count,
    };
  });

  // Recent-activity feed — top N most-recent ledger entries across
  // every treasury the caller can see. Joins the source rows so the
  // client can display "who paid what" or "who was paid" inline
  // without a follow-up round-trip.
  const recentEntries = entries.slice(0, RECENT_FEED_LIMIT);
  const paymentIds = Array.from(
    new Set(recentEntries.map((e) => e.payment_id).filter((x): x is string => !!x)),
  );
  const expenseIds = Array.from(
    new Set(recentEntries.map((e) => e.expense_id).filter((x): x is string => !!x)),
  );
  const [{ data: paymentsRaw }, { data: expensesRaw }] = await Promise.all([
    paymentIds.length
      ? supabase
          .schema('finance' as never)
          .from('payments' as never)
          .select('id, payer_member_id, metadata, reverses_payment_id')
          .in('id', paymentIds)
      : Promise.resolve({ data: [] as RawPayment[] }),
    expenseIds.length
      ? supabase
          .schema('finance' as never)
          .from('expenses' as never)
          .select('id, payee, reverses_expense_id')
          .in('id', expenseIds)
      : Promise.resolve({ data: [] as RawExpense[] }),
  ]);
  const payments = (paymentsRaw ?? []) as RawPayment[];
  const expenses = (expensesRaw ?? []) as RawExpense[];
  const memberIds = Array.from(
    new Set(payments.map((p) => p.payer_member_id).filter((x): x is string => !!x)),
  );
  const { data: memberRows } = memberIds.length
    ? await supabase.schema('core').from('members').select('id, full_name').in('id', memberIds)
    : { data: [] as RawMember[] };
  const memberById = new Map(((memberRows ?? []) as RawMember[]).map((m) => [m.id, m.full_name]));
  const paymentById = new Map(payments.map((p) => [p.id, p]));
  const expenseById = new Map(expenses.map((e) => [e.id, e]));

  const recentFeed: RecentEntry[] = recentEntries.map((e) => {
    const payment = e.payment_id ? paymentById.get(e.payment_id) : null;
    const expense = e.expense_id ? expenseById.get(e.expense_id) : null;
    let counterparty = '';
    let isReversal = false;
    if (payment) {
      const meta = (payment.metadata ?? {}) as { donor_name?: string; public_donation?: boolean };
      const donorLabel = meta.donor_name ?? (meta.public_donation ? 'Anonymous donor' : null);
      counterparty =
        (payment.payer_member_id ? memberById.get(payment.payer_member_id) : null) ??
        donorLabel ??
        'Payment';
      isReversal = !!payment.reverses_payment_id;
    } else if (expense) {
      counterparty = expense.payee;
      isReversal = !!expense.reverses_expense_id;
    }
    const scope = scopeById.get(e.scope_id);
    return {
      id: e.id,
      createdAt: e.created_at,
      direction: e.direction === 'income' ? 'income' : 'expense',
      amount: parseFloat(e.amount),
      currency: e.currency,
      counterparty,
      scopeName: scope?.name ?? '—',
      scopeSlug: scope?.slug ?? '',
      isReversal,
      memo: e.memo,
    };
  });

  if (treasuries.length === 0) {
    return (
      <section className="flex flex-1 flex-col gap-6">
        <header className="flex flex-col gap-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Finance
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Wallet className="h-6 w-6" />
            Treasury
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Every finance-bearing scope you can see, with its live balance and last-30-day flow.
          </p>
        </header>
        <GradientPanel className="p-10 text-center">
          <Wallet className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-base font-semibold text-foreground">No treasuries in view</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            You don&apos;t hold treasury.read at any scope yet. Ask an admin to grant it at the
            branch or chapter you should see.
          </p>
        </GradientPanel>
      </section>
    );
  }

  return <TreasuryLandingView treasuries={treasuriesOut} recentFeed={recentFeed} />;
}
