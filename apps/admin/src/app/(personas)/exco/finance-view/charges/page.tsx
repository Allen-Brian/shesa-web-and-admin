import { BadgeDollarSign } from 'lucide-react';

import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Admin — Charges (read-only)' };

interface ChargeRow {
  readonly id: string;
  readonly scope_id: string;
  readonly name: string;
  readonly shape: string;
  readonly base_amount: string | null;
  readonly currency: string;
  readonly status: string;
  readonly created_at: string;
}

interface ScopeRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

/**
 * Admin's read-only view of Charges.
 *
 * Money-mover surface (create/update/archive) lives under the /finance
 * persona for the Finance role. This page just LISTS what the admin can
 * see via RLS so they know what money's being asked for at their scope.
 */
export default async function ExcoChargesViewPage() {
  const supabase = await getServerClient();

  const { data: chargesRaw } = await supabase
    .schema('finance' as never)
    .from('charges' as never)
    .select('id, scope_id, name, shape, base_amount, currency, status, created_at')
    .in('shape', ['charge', 'fixed'])
    .order('created_at', { ascending: false });

  const charges = (chargesRaw ?? []) as ChargeRow[];
  const scopeIds = Array.from(new Set(charges.map((c) => c.scope_id)));
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
          <BadgeDollarSign className="h-6 w-6" />
          Charges
        </h1>
        <p className="text-sm text-muted-foreground">
          Dues + levies at scopes you can see. Creating and editing charges is the Finance
          role&apos;s job — switch to the Finance portal to run those actions.
        </p>
      </header>

      {charges.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No charges are visible at your scopes yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {charges.map((c) => {
            const scope = scopeById.get(c.scope_id);
            return (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {scope?.name ?? '—'} · {c.shape} · {c.status}
                  </span>
                </div>
                <span className="text-sm font-mono text-foreground">
                  {c.base_amount
                    ? `${new Intl.NumberFormat().format(parseFloat(c.base_amount))} ${c.currency}`
                    : '—'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
