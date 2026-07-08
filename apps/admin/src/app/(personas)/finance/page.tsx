import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  ClipboardCheck,
  ClipboardList,
  HandCoins,
  Receipt,
  Wallet,
} from 'lucide-react';

import { Badge, GradientPanel, StatsCard } from '@shesa/ui';

import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Shesa Finance — Dashboard',
};

interface TreasuryRow {
  readonly scope_id: string;
  readonly balance: string;
  readonly currency: string;
  readonly updated_at: string;
}

interface ScopeRow {
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
  readonly method: string;
  readonly metadata: Record<string, unknown> | null;
  readonly reverses_payment_id: string | null;
}

interface RawExpense {
  readonly id: string;
  readonly payee: string;
  readonly amount: string;
  readonly currency: string;
  readonly scope_id: string;
  readonly status: string;
  readonly incurred_at: string;
  readonly reverses_expense_id: string | null;
}

interface RawMember {
  readonly id: string;
  readonly full_name: string;
}

const THIRTY_DAY_MS = 30 * 24 * 60 * 60 * 1000;
const RECENT_LIMIT = 8;
const TOP_TREASURIES = 4;

/**
 * Finance dashboard — the persona's landing.
 *
 * The RLS floor from M1 does visibility work: SELECT on
 * finance.treasury_balances / payments / expenses / ledger_entries
 * filters to scopes the caller holds finance.read at.
 *
 * The dashboard is organised as an operational triage view rather
 * than a data explorer:
 *   • Hero KPIs — total on hand + last-30-day flow.
 *   • Quick actions — jump straight into recording a payment /
 *     expense, opening the charge list, or clearing the approval
 *     queue.
 *   • Pending queue — expenses awaiting approval get their own
 *     panel with a link to the queue.
 *   • Top treasuries — the biggest balances, sorted desc, with
 *     a link to the full Treasury landing.
 *   • Recent activity — mixed payments + expenses feed so nothing
 *     slips off the operator's radar.
 */
export default async function FinanceDashboardPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/finance');

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAY_MS);

  const [
    { data: treasuriesRaw },
    { data: ledgerRaw },
    { data: pendingExpensesRaw },
    { data: recentPaymentsRaw },
    { data: recentExpensesRaw },
  ] = await Promise.all([
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
    supabase
      .schema('finance' as never)
      .from('expenses' as never)
      .select('id, payee, amount, currency, scope_id, status, incurred_at, reverses_expense_id')
      .eq('status', 'pending_approval')
      .order('incurred_at', { ascending: false })
      .limit(10),
    supabase
      .schema('finance' as never)
      .from('payments' as never)
      .select('id, payer_member_id, method, metadata, reverses_payment_id')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .schema('finance' as never)
      .from('expenses' as never)
      .select('id, payee, amount, currency, scope_id, status, incurred_at, reverses_expense_id')
      .order('incurred_at', { ascending: false })
      .limit(30),
  ]);

  const treasuries = (treasuriesRaw ?? []) as TreasuryRow[];
  const ledger = (ledgerRaw ?? []) as RawLedgerEntry[];
  const pendingExpenses = (pendingExpensesRaw ?? []) as RawExpense[];
  const paymentsMeta = (recentPaymentsRaw ?? []) as RawPayment[];
  const recentExpenses = (recentExpensesRaw ?? []) as RawExpense[];

  const scopeIds = Array.from(
    new Set([
      ...treasuries.map((t) => t.scope_id),
      ...ledger.map((l) => l.scope_id),
      ...pendingExpenses.map((e) => e.scope_id),
      ...recentExpenses.map((e) => e.scope_id),
    ]),
  );

  const { data: scopeRows } = scopeIds.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, slug, scope_type')
        .in('id', scopeIds)
    : { data: [] as ScopeRow[] };
  const scopeById = new Map(((scopeRows ?? []) as ScopeRow[]).map((s) => [s.id, s]));
  const paymentById = new Map(paymentsMeta.map((p) => [p.id, p]));

  // Resolve member names for the recent-activity feed's payment rows.
  const memberIds = Array.from(
    new Set(paymentsMeta.map((p) => p.payer_member_id).filter((x): x is string => !!x)),
  );
  const { data: memberRows } = memberIds.length
    ? await supabase.schema('core').from('members').select('id, full_name').in('id', memberIds)
    : { data: [] as RawMember[] };
  const memberById = new Map(((memberRows ?? []) as RawMember[]).map((m) => [m.id, m.full_name]));

  // Hero KPIs — total balance + 30-day flow per currency.
  const balanceByCurrency = new Map<string, number>();
  for (const t of treasuries) {
    balanceByCurrency.set(
      t.currency,
      (balanceByCurrency.get(t.currency) ?? 0) + parseFloat(t.balance),
    );
  }
  const flowByCurrency = new Map<string, { income: number; expenses: number }>();
  for (const e of ledger) {
    const amt = parseFloat(e.amount);
    const cur = flowByCurrency.get(e.currency) ?? { income: 0, expenses: 0 };
    if (e.direction === 'income') cur.income += amt;
    else if (e.direction === 'expense') cur.expenses += amt;
    flowByCurrency.set(e.currency, cur);
  }

  const singleCurrency: string | null =
    balanceByCurrency.size === 1 ? (balanceByCurrency.keys().next().value ?? null) : null;
  const totalBalance = singleCurrency ? (balanceByCurrency.get(singleCurrency) ?? 0) : null;
  const flow = singleCurrency ? flowByCurrency.get(singleCurrency) : null;
  const income = flow?.income ?? 0;
  const expensesSum = flow?.expenses ?? 0;
  const netFlow = income - expensesSum;

  // Top treasuries — sorted by balance desc.
  const topTreasuries = treasuries
    .slice()
    .sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance))
    .slice(0, TOP_TREASURIES);

  // Pending approvals summary.
  const pendingSummary = {
    count: pendingExpenses.length,
    totalByCurrency: new Map<string, number>(),
  };
  for (const e of pendingExpenses) {
    pendingSummary.totalByCurrency.set(
      e.currency,
      (pendingSummary.totalByCurrency.get(e.currency) ?? 0) + parseFloat(e.amount),
    );
  }

  // Recent activity — merge payments (from ledger income entries) +
  // expenses, newest first, capped.
  interface Activity {
    id: string;
    when: string;
    kind: 'payment' | 'expense' | 'other';
    direction: 'income' | 'expense';
    amount: number;
    currency: string;
    counterparty: string;
    scopeName: string;
    scopeSlug: string;
    isReversal: boolean;
  }
  const activity: Activity[] = ledger
    .slice(0, 40)
    .map((l) => {
      const scope = scopeById.get(l.scope_id);
      let kind: Activity['kind'] = 'other';
      let counterparty = 'Ledger entry';
      let isReversal = false;
      if (l.payment_id) {
        kind = 'payment';
        const p = paymentById.get(l.payment_id);
        const meta = (p?.metadata ?? {}) as { donor_name?: string; public_donation?: boolean };
        const donorLabel = meta.donor_name ?? (meta.public_donation ? 'Anonymous donor' : null);
        counterparty =
          (p?.payer_member_id ? memberById.get(p.payer_member_id) : null) ??
          donorLabel ??
          'Payment';
        isReversal = !!p?.reverses_payment_id;
      } else if (l.expense_id) {
        kind = 'expense';
        const e = recentExpenses.find((x) => x.id === l.expense_id);
        counterparty = e?.payee ?? 'Expense';
        isReversal = !!e?.reverses_expense_id;
      }
      return {
        id: l.id,
        when: l.created_at,
        kind,
        direction: (l.direction === 'expense' ? 'expense' : 'income') as 'income' | 'expense',
        amount: parseFloat(l.amount),
        currency: l.currency,
        counterparty,
        scopeName: scope?.name ?? '—',
        scopeSlug: scope?.slug ?? '',
        isReversal,
      };
    })
    .slice(0, RECENT_LIMIT);

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Wallet className="h-6 w-6" />
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          {treasuries.length === 0
            ? 'No treasuries are visible to you yet.'
            : `${treasuries.length} treasur${treasuries.length === 1 ? 'y' : 'ies'} in view · financial pulse for the last 30 days.`}
        </p>
      </header>

      {/* ── Hero KPIs ──────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total on hand"
          value={
            singleCurrency && totalBalance !== null
              ? formatMoney(totalBalance, singleCurrency)
              : balanceByCurrency.size > 1
                ? 'multi-currency'
                : '—'
          }
        />
        <StatsCard
          label="30-day inflow"
          value={singleCurrency ? formatMoney(income, singleCurrency) : '—'}
        />
        <StatsCard
          label="30-day outflow"
          value={singleCurrency ? formatMoney(expensesSum, singleCurrency) : '—'}
        />
        <StatsCard
          label="30-day net"
          value={
            singleCurrency
              ? `${netFlow >= 0 ? '+' : ''}${formatMoney(netFlow, singleCurrency)}`
              : '—'
          }
        />
      </div>

      {/* Multi-currency chip strip — surfaces when balances span
       * more than one currency so operators don't miss a smaller pot. */}
      {balanceByCurrency.size > 1 && (
        <div className="flex flex-wrap gap-3">
          {Array.from(balanceByCurrency.entries()).map(([currency, amount]) => (
            <div
              key={currency}
              className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3"
            >
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                On hand · {currency}
              </span>
              <span className="text-xl font-semibold text-foreground tabular-nums">
                {new Intl.NumberFormat().format(Math.round(amount))}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Quick actions ──────────────────────────────────── */}
      <div>
        <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Quick actions
        </span>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href="/finance/payments"
            icon={HandCoins}
            iconClass="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            label="Record a payment"
            hint="Cash / MoMo / bank"
          />
          <QuickAction
            href="/finance/expenses"
            icon={Receipt}
            iconClass="bg-amber-500/15 text-amber-700 dark:text-amber-400"
            label="Record an expense"
            hint={
              pendingSummary.count > 0 ? `${pendingSummary.count} pending approval` : 'Money out'
            }
            badgeCount={pendingSummary.count}
          />
          <QuickAction
            href="/finance/charges"
            icon={BadgeDollarSign}
            iconClass="bg-primary/10 text-primary"
            label="New charge"
            hint="Dues, levies, fixed"
          />
          <QuickAction
            href="/finance/reports"
            icon={ClipboardList}
            iconClass="bg-sky-500/15 text-sky-700 dark:text-sky-300"
            label="Run a report"
            hint="Collections, arrears, …"
          />
        </div>
      </div>

      {/* ── Two-column grid: Treasuries + Pending queue ────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Top treasuries */}
        <GradientPanel className="flex flex-col gap-3 p-5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">Top treasuries</span>
            <Link
              href="/finance/treasury"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {topTreasuries.length === 0 ? (
            <EmptyInline label="No treasuries in view. Ask an admin to grant treasury.read at a scope you should see." />
          ) : (
            <ul className="flex flex-col divide-y divide-border/50">
              {topTreasuries.map((t) => {
                const scope = scopeById.get(t.scope_id);
                const balance = parseFloat(t.balance);
                const href = scope?.slug ? `/finance/treasury/${scope.slug}` : '#';
                return (
                  <li key={t.scope_id} className="py-2.5 first:pt-0 last:pb-0">
                    <Link href={href} className="flex items-center justify-between gap-3 group">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Wallet className="h-4 w-4" />
                        </div>
                        <div className="flex min-w-0 flex-col leading-tight">
                          <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                            {scope?.name ?? '(unknown scope)'}
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground capitalize">
                            {scope?.scope_type ?? '—'}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          balance < 0 ? 'text-destructive' : 'text-foreground'
                        }`}
                      >
                        {formatMoney(balance, t.currency)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </GradientPanel>

        {/* Pending approvals — visible even when zero so operators
         * can see the queue is clear. */}
        <GradientPanel className="flex flex-col gap-3 p-5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ClipboardCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Pending approvals
            </span>
            {pendingSummary.count > 0 && (
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              >
                {pendingSummary.count}
              </Badge>
            )}
          </div>
          {pendingSummary.count === 0 ? (
            <EmptyInline label="Queue clear — no expenses awaiting approval." />
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-border/50">
                {pendingExpenses.slice(0, 4).map((e) => {
                  const scope = scopeById.get(e.scope_id);
                  return (
                    <li key={e.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-col leading-tight">
                          <span className="truncate text-sm font-medium text-foreground">
                            {e.payee}
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            {scope?.name ?? '—'} · {new Date(e.incurred_at).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-foreground tabular-nums">
                          {formatMoney(parseFloat(e.amount), e.currency)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/finance/expenses"
                className="inline-flex items-center gap-1 self-start text-xs text-primary hover:underline"
              >
                Open queue
                <ArrowRight className="h-3 w-3" />
              </Link>
            </>
          )}
        </GradientPanel>
      </div>

      {/* ── Recent activity ────────────────────────────────── */}
      <GradientPanel className="flex flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">Recent activity</span>
          <span className="text-xs text-muted-foreground">
            {activity.length} most recent movement{activity.length === 1 ? '' : 's'}
          </span>
        </div>
        {activity.length === 0 ? (
          <EmptyInline label="No ledger activity yet in the last 30 days." />
        ) : (
          <ul className="flex flex-col divide-y divide-border/50">
            {activity.map((a) => {
              const isIncome = a.direction === 'income';
              const Icon = isIncome ? ArrowUpRight : ArrowDownRight;
              const tone = isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive';
              const scopeHref = a.scopeSlug ? `/finance/treasury/${a.scopeSlug}` : null;
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      isIncome ? 'bg-emerald-500/10' : 'bg-destructive/10'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${tone}`} />
                  </div>
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-sm font-medium text-foreground">
                      {a.counterparty}
                      {a.isReversal && (
                        <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                          reversal
                        </span>
                      )}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {scopeHref ? (
                        <Link href={scopeHref} className="hover:text-foreground hover:underline">
                          {a.scopeName}
                        </Link>
                      ) : (
                        a.scopeName
                      )}
                    </span>
                  </div>
                  <div className="ml-auto flex flex-col items-end leading-tight">
                    <span className={`text-sm font-medium tabular-nums ${tone}`}>
                      {isIncome ? '+' : '−'}
                      {formatMoney(a.amount, a.currency)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatRelative(a.when)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </GradientPanel>
    </section>
  );
}

// ─── UI primitives ──────────────────────────────────────────────────

function QuickAction({
  href,
  icon: Icon,
  iconClass,
  label,
  hint,
  badgeCount,
}: {
  readonly href: string;
  readonly icon: typeof Wallet;
  readonly iconClass: string;
  readonly label: string;
  readonly hint: string;
  readonly badgeCount?: number;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
    >
      <div
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
      >
        <Icon className="h-4 w-4" />
        {badgeCount !== undefined && badgeCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground">
            {badgeCount}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-sm font-semibold text-foreground group-hover:text-primary">
          {label}
        </span>
        <span className="truncate text-xs text-muted-foreground">{hint}</span>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

function EmptyInline({ label }: { readonly label: string }) {
  return (
    <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-center text-xs italic text-muted-foreground">
      {label}
    </p>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatMoney(amount: number, currency: string): string {
  return `${new Intl.NumberFormat().format(Math.round(amount))} ${currency}`;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const secs = Math.round((now - then) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}
