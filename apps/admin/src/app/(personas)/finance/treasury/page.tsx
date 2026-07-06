import Link from 'next/link';
import { Wallet } from 'lucide-react';

import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Treasury' };

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

/**
 * Treasury landing — the list of scopes the finance user can see + a
 * balance-at-a-glance. Clicking a scope opens its Treasury Statement
 * (deferred to the next slice; the DB fn finance.get_treasury_statement
 * is ready).
 */
export default async function TreasuryPage() {
  const supabase = await getServerClient();

  const { data: treasuriesRaw } = await supabase
    .schema('finance' as never)
    .from('treasury_balances' as never)
    .select('scope_id, balance, currency, updated_at');
  const treasuries = (treasuriesRaw ?? []) as TreasuryRow[];

  const scopeIds = treasuries.map((t) => t.scope_id);
  const { data: scopeRows } = scopeIds.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, slug, scope_type')
        .in('id', scopeIds)
    : { data: [] as ScopeRow[] };
  const scopeById = new Map(((scopeRows ?? []) as ScopeRow[]).map((s) => [s.id, s]));

  return (
    <section className="flex flex-1 flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Insight
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Wallet className="h-6 w-6" />
          Treasury
        </h1>
        <p className="text-sm text-muted-foreground">
          {treasuries.length === 0
            ? 'No treasuries visible to you yet.'
            : `${treasuries.length} treasur${treasuries.length === 1 ? 'y' : 'ies'} in view. Pick one for its opening / income / expenses / closing statement.`}
        </p>
      </header>

      {treasuries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Ask an admin to grant treasury.read at a scope you should see.
        </div>
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
                <div className="text-xs text-muted-foreground">
                  Updated {new Date(t.updated_at).toLocaleString()}
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
  );
}

function formatAmount(amount: number, currency: string): string {
  const rounded = Math.round(amount * 100) / 100;
  return `${new Intl.NumberFormat().format(rounded)} ${currency}`;
}
