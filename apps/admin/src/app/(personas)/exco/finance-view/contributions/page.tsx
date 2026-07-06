import { Target } from 'lucide-react';

import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Admin — Contributions (read-only)' };

interface ContributionRow {
  readonly id: string;
  readonly scope_id: string;
  readonly name: string;
  readonly shape: string;
  readonly goal_amount: string | null;
  readonly currency: string;
  readonly lifecycle: string | null;
  readonly close_date: string | null;
}

interface ScopeRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export default async function ExcoContributionsViewPage() {
  const supabase = await getServerClient();

  const { data: contributionsRaw } = await supabase
    .schema('finance' as never)
    .from('charges' as never)
    .select('id, scope_id, name, shape, goal_amount, currency, lifecycle, close_date')
    .in('shape', ['goal', 'open', 'ticketed'])
    .order('close_date', { ascending: true, nullsFirst: false });

  const contributions = (contributionsRaw ?? []) as ContributionRow[];
  const scopeIds = Array.from(new Set(contributions.map((c) => c.scope_id)));
  const { data: scopeRows } = scopeIds.length
    ? await supabase.schema('core').from('scopes').select('id, name, slug').in('id', scopeIds)
    : { data: [] as ScopeRow[] };
  const scopeById = new Map(((scopeRows ?? []) as ScopeRow[]).map((s) => [s.id, s]));

  return (
    <section className="flex flex-1 flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance · read-only
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Target className="h-6 w-6" />
          Contributions
        </h1>
        <p className="text-sm text-muted-foreground">
          Goal, open, and ticketed contributions at scopes you can see. Approving, closing, and
          extending are Finance actions.
        </p>
      </header>

      {contributions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No contributions are visible at your scopes yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {contributions.map((c) => {
            const scope = scopeById.get(c.scope_id);
            return (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {scope?.name ?? '—'} · {c.shape} · {c.lifecycle ?? '—'}
                    {c.close_date && ` · closes ${new Date(c.close_date).toLocaleDateString()}`}
                  </span>
                </div>
                <span className="text-sm font-mono text-foreground">
                  {c.goal_amount
                    ? `Goal: ${new Intl.NumberFormat().format(parseFloat(c.goal_amount))} ${c.currency}`
                    : c.currency}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
