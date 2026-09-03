import { BadgeDollarSign } from 'lucide-react';

import { getServerClient } from '@/lib/supabase-server';

import { ExcoChargesView, type ChargeRow } from './widgets/exco-charges-view';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Admin — Charges (read-only)' };

interface RawChargeRow {
  readonly id: string;
  readonly scope_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly shape: string;
  readonly base_amount: number | null;
  readonly currency: string;
  readonly recurrence: string;
  readonly recurrence_interval: number;
  readonly status: string;
  readonly activation_date: string | null;
  readonly created_at: string;
}

interface ScopeRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

/**
 * Admin's read-only view of Charges — same shape as the Finance
 * dashboard (stats cards → panel → table). Rows link out to the
 * shared charge-detail drill-down.
 */
export default async function ExcoChargesViewPage() {
  const supabase = await getServerClient();

  const { data: chargesRaw } = await supabase
    .schema('finance')
    .from('charges')
    .select(
      'id, scope_id, name, description, shape, base_amount, currency, recurrence, recurrence_interval, status, activation_date, created_at',
    )
    .in('shape', ['charge', 'fixed'])
    .order('created_at', { ascending: false });

  const charges = (chargesRaw ?? []) as RawChargeRow[];
  const scopeIds = Array.from(new Set(charges.map((c) => c.scope_id)));
  const { data: scopeRows } = scopeIds.length
    ? await supabase.schema('core').from('scopes').select('id, name, slug').in('id', scopeIds)
    : { data: [] as ScopeRow[] };
  const scopeById = new Map(((scopeRows ?? []) as ScopeRow[]).map((s) => [s.id, s]));

  const rows: ChargeRow[] = charges.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    scopeName: scopeById.get(c.scope_id)?.name ?? '—',
    shape: c.shape,
    baseAmount: c.base_amount != null ? c.base_amount : null,
    currency: c.currency,
    recurrence: c.recurrence,
    recurrenceInterval: c.recurrence_interval,
    status: c.status,
    activationDate: c.activation_date,
  }));

  return (
    <section className="flex flex-1 flex-col gap-5">
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

      <ExcoChargesView rows={rows} />
    </section>
  );
}
