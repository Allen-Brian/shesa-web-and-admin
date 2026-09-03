import { Target } from 'lucide-react';

import { getServerClient } from '@/lib/supabase-server';

import { ExcoContributionsView, type ContributionRow } from './widgets/exco-contributions-view';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Admin — Contributions (read-only)' };

interface RawContributionRow {
  readonly id: string;
  readonly scope_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly shape: string;
  readonly goal_amount: string | null;
  readonly base_amount: number | null;
  readonly currency: string;
  readonly lifecycle: string | null;
  readonly open_date: string | null;
  readonly close_date: string | null;
  readonly capacity: number | null;
}

interface ScopeRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

interface RawPaymentRow {
  readonly charge_id: string | null;
  readonly amount: number;
  readonly payer_member_id: string | null;
  readonly reverses_payment_id: string | null;
  readonly metadata: Record<string, unknown> | null;
}

/**
 * Exco global admin's read-only mirror of Contributions. Loads the
 * same shape as the Finance list (Progress + Contributors columns)
 * so admins get a full picture — not just a stub row. Row-click
 * navigates to the Exco charge detail mirror so the persona doesn't
 * silently switch to Finance.
 */
export default async function ExcoContributionsViewPage() {
  const supabase = await getServerClient();

  const [{ data: contributionsRaw }, { data: paymentsRaw }] = await Promise.all([
    supabase
      .schema('finance')
      .from('charges')
      .select(
        'id, scope_id, name, description, shape, goal_amount, base_amount, currency, lifecycle, open_date, close_date, capacity',
      )
      .in('shape', ['goal', 'open', 'ticketed', 'fixed'])
      .order('close_date', { ascending: true, nullsFirst: false }),
    supabase
      .schema('finance')
      .from('payments')
      .select('charge_id, amount, payer_member_id, reverses_payment_id, metadata')
      .limit(5000),
  ]);

  const contributions = (contributionsRaw ?? []) as RawContributionRow[];
  const paymentsData = (paymentsRaw ?? []) as RawPaymentRow[];

  const scopeIds = Array.from(new Set(contributions.map((c) => c.scope_id)));
  const { data: scopeRows } = scopeIds.length
    ? await supabase.schema('core').from('scopes').select('id, name, slug').in('id', scopeIds)
    : { data: [] as ScopeRow[] };
  const scopeById = new Map(((scopeRows ?? []) as ScopeRow[]).map((s) => [s.id, s]));

  const progressByCharge = new Map<
    string,
    { raised: number; contributors: Set<string>; anonymousCount: number }
  >();
  for (const p of paymentsData) {
    if (!p.charge_id || p.reverses_payment_id) continue;
    const bucket = progressByCharge.get(p.charge_id) ?? {
      raised: 0,
      contributors: new Set<string>(),
      anonymousCount: 0,
    };
    bucket.raised += p.amount;
    if (p.payer_member_id) {
      bucket.contributors.add(p.payer_member_id);
    } else {
      const meta = (p.metadata ?? {}) as { donor_name?: string };
      if (meta.donor_name) {
        bucket.contributors.add(`donor:${meta.donor_name}`);
      } else {
        bucket.anonymousCount += 1;
      }
    }
    progressByCharge.set(p.charge_id, bucket);
  }

  const rows: ContributionRow[] = contributions.map((c) => {
    const progress = progressByCharge.get(c.id);
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      scopeName: scopeById.get(c.scope_id)?.name ?? '—',
      shape: c.shape,
      goalAmount: c.goal_amount != null ? parseFloat(c.goal_amount) : null,
      baseAmount: c.base_amount != null ? c.base_amount : null,
      currency: c.currency,
      lifecycle: c.lifecycle,
      openDate: c.open_date,
      closeDate: c.close_date,
      capacity: c.capacity,
      raised: progress?.raised ?? 0,
      contributorCount: (progress?.contributors.size ?? 0) + (progress?.anonymousCount ?? 0),
    };
  });

  return (
    <section className="flex flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance · read-only
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Target className="h-6 w-6" />
          Contributions
        </h1>
        <p className="text-sm text-muted-foreground">
          Goal, open, ticketed, and fixed contributions at scopes you can see. Approving, closing,
          and extending are Finance actions.
        </p>
      </header>

      <ExcoContributionsView rows={rows} />
    </section>
  );
}
