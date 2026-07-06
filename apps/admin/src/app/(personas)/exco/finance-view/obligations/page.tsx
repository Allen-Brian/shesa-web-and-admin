import { ClipboardList } from 'lucide-react';

import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Admin — Obligations (read-only)' };

interface ObligationRow {
  readonly id: string;
  readonly charge_id: string;
  readonly scope_id: string;
  readonly party_id: string;
  readonly amount: string;
  readonly currency: string;
  readonly status: string;
  readonly period_start: string | null;
  readonly created_at: string;
}

interface MemberRow {
  readonly id: string;
  readonly full_name: string;
}

interface ChargeRow {
  readonly id: string;
  readonly name: string;
}

interface ScopeRow {
  readonly id: string;
  readonly name: string;
}

/**
 * Admin's read-only view of Obligations.
 *
 * The Obligations concept is normally hidden from users per spec Part
 * VI ("surfaces only as who owes / arrears / a member's balance") — but
 * the admin walkthrough on 2026-07-06 asked for a direct list so admins
 * can hunt individual entries by member. This page renders the flat
 * list without exposing the underlying framing (no "ledger," no
 * "journal," no "double-entry" copy).
 *
 * Bulk of the rendering discipline stays the spec's: "spelled as
 * balances / arrears / who owes," not as engine primitives.
 */
export default async function ExcoObligationsViewPage() {
  const supabase = await getServerClient();

  const { data: obligationsRaw } = await supabase
    .schema('finance' as never)
    .from('obligations' as never)
    .select('id, charge_id, scope_id, party_id, amount, currency, status, period_start, created_at')
    .in('status', ['open', 'partial'])
    .order('created_at', { ascending: false })
    .limit(200);

  const obligations = (obligationsRaw ?? []) as ObligationRow[];
  const memberIds = Array.from(new Set(obligations.map((o) => o.party_id)));
  const chargeIds = Array.from(new Set(obligations.map((o) => o.charge_id)));
  const scopeIds = Array.from(new Set(obligations.map((o) => o.scope_id)));

  const [{ data: memberRows }, { data: chargeRows }, { data: scopeRows }] = await Promise.all([
    memberIds.length
      ? supabase.schema('core').from('members').select('id, full_name').in('id', memberIds)
      : Promise.resolve({ data: [] as MemberRow[] }),
    chargeIds.length
      ? supabase
          .schema('finance' as never)
          .from('charges' as never)
          .select('id, name')
          .in('id', chargeIds)
      : Promise.resolve({ data: [] as ChargeRow[] }),
    scopeIds.length
      ? supabase.schema('core').from('scopes').select('id, name').in('id', scopeIds)
      : Promise.resolve({ data: [] as ScopeRow[] }),
  ]);
  const memberById = new Map(((memberRows ?? []) as MemberRow[]).map((m) => [m.id, m]));
  const chargeById = new Map(((chargeRows ?? []) as ChargeRow[]).map((c) => [c.id, c]));
  const scopeById = new Map(((scopeRows ?? []) as ScopeRow[]).map((s) => [s.id, s]));

  return (
    <section className="flex flex-1 flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance · read-only
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ClipboardList className="h-6 w-6" />
          Obligations
        </h1>
        <p className="text-sm text-muted-foreground">
          Open + partial obligations across scopes you can see. Newest 200. Editing them is a
          Finance action.
        </p>
      </header>

      {obligations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No open obligations at your scopes right now.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {obligations.map((o) => {
            const member = memberById.get(o.party_id);
            const charge = chargeById.get(o.charge_id);
            const scope = scopeById.get(o.scope_id);
            return (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {member?.full_name ?? '(unknown)'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {charge?.name ?? '—'} · {scope?.name ?? '—'} · {o.status}
                    {o.period_start && ` · period ${new Date(o.period_start).toLocaleDateString()}`}
                  </span>
                </div>
                <span className="text-sm font-mono text-foreground">
                  {new Intl.NumberFormat().format(parseFloat(o.amount))} {o.currency}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
