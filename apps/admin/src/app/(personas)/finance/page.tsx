import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CircleDollarSign, TrendingDown, TrendingUp, Wallet } from 'lucide-react';

import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Shesa Finance — Dashboard',
};

interface TreasuryRow {
  readonly scope_id: string;
  readonly balance: string;
  readonly currency: string;
}

interface ScopeRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly scope_type: string;
  readonly chapter_kind: string | null;
}

interface RecentPaymentRow {
  readonly id: string;
  readonly amount: string;
  readonly currency: string;
  readonly method: string;
  readonly scope_id: string;
  readonly created_at: string;
  readonly reverses_payment_id: string | null;
}

/**
 * Finance dashboard — landing for the finance persona.
 *
 * The RLS floor from M1 does the visibility work: SELECT on
 * finance.treasury_balances (and payments) filters to scopes the caller
 * holds treasury.read at. Global finance sees every treasury; a
 * branch-scoped finance officer sees only theirs. The page reads what
 * comes back and renders it.
 */
export default async function FinanceDashboardPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/finance');

  const [{ data: treasuriesRaw }, { data: recentPaymentsRaw }] = await Promise.all([
    supabase
      .schema('finance' as never)
      .from('treasury_balances' as never)
      .select('scope_id, balance, currency'),
    supabase
      .schema('finance' as never)
      .from('payments' as never)
      .select('id, amount, currency, method, scope_id, created_at, reverses_payment_id')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const treasuries = (treasuriesRaw ?? []) as TreasuryRow[];
  const recentPayments = (recentPaymentsRaw ?? []) as RecentPaymentRow[];
  const scopeIds = Array.from(
    new Set([...treasuries.map((t) => t.scope_id), ...recentPayments.map((p) => p.scope_id)]),
  );
  const { data: scopeRows } = scopeIds.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, slug, scope_type, chapter_kind')
        .in('id', scopeIds)
    : { data: [] as ScopeRow[] };
  const scopeById = new Map(((scopeRows ?? []) as ScopeRow[]).map((s) => [s.id, s]));

  const totalBalanceByCurrency = new Map<string, number>();
  for (const t of treasuries) {
    totalBalanceByCurrency.set(
      t.currency,
      (totalBalanceByCurrency.get(t.currency) ?? 0) + parseFloat(t.balance),
    );
  }

  const totalIncome = recentPayments
    .filter((p) => !p.reverses_payment_id)
    .reduce((acc, p) => acc + parseFloat(p.amount), 0);
  const reversalCount = recentPayments.filter((p) => p.reverses_payment_id).length;

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-1">
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
            : `${treasuries.length} treasur${treasuries.length === 1 ? 'y' : 'ies'} in view.`}
        </p>
      </header>

      {/* Aggregate stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from(totalBalanceByCurrency.entries()).map(([currency, amount]) => (
          <StatCard
            key={currency}
            label={`Total balance (${currency})`}
            value={formatAmount(amount, currency)}
            Icon={Wallet}
            tone="emerald"
          />
        ))}
        <StatCard
          label="Recent income"
          value={formatAmount(totalIncome, 'XAF')}
          Icon={TrendingUp}
          tone="sky"
        />
        <StatCard
          label="Reversals in view"
          value={String(reversalCount)}
          Icon={TrendingDown}
          tone={reversalCount > 0 ? 'amber' : 'muted'}
        />
      </div>

      {/* Treasuries list */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Treasuries
        </h2>
        {treasuries.length === 0 ? (
          <EmptyCard label="No treasuries in view. Ask an admin to grant treasury.read at a scope you should see." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {treasuries.map((t) => {
              const scope = scopeById.get(t.scope_id);
              return (
                <li
                  key={t.scope_id}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-foreground">
                      {scope?.name ?? '(unknown scope)'}
                    </div>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      {scope?.scope_type ?? '—'}
                    </span>
                  </div>
                  <div className="text-2xl font-semibold text-foreground">
                    {formatAmount(parseFloat(t.balance), t.currency)}
                  </div>
                  <Link
                    href={`/finance/treasury/${scope?.slug ?? ''}`}
                    className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    View statement →
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Recent activity */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent payments
        </h2>
        {recentPayments.length === 0 ? (
          <EmptyCard label="No payments visible in the current view." />
        ) : (
          <ul className="flex flex-col gap-2">
            {recentPayments.map((p) => {
              const scope = scopeById.get(p.scope_id);
              const isReversal = !!p.reverses_payment_id;
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <CircleDollarSign
                      className={isReversal ? 'h-4 w-4 text-amber-600' : 'h-4 w-4 text-emerald-600'}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {isReversal ? 'Reversal · ' : ''}
                        {formatAmount(parseFloat(p.amount), p.currency)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {scope?.name ?? '—'} · {p.method}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}

function StatCard({
  label,
  value,
  Icon,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly Icon: typeof Wallet;
  readonly tone: 'emerald' | 'sky' | 'amber' | 'muted';
}) {
  const toneCls: Record<string, string> = {
    emerald: 'text-emerald-700 dark:text-emerald-400',
    sky: 'text-sky-700 dark:text-sky-300',
    amber: 'text-amber-700 dark:text-amber-400',
    muted: 'text-foreground',
  };
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-semibold ${toneCls[tone]}`}>{value}</div>
    </div>
  );
}

function EmptyCard({ label }: { readonly label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function formatAmount(amount: number, currency: string): string {
  const rounded = Math.round(amount * 100) / 100;
  return `${new Intl.NumberFormat().format(rounded)} ${currency}`;
}
