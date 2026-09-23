import { notFound } from 'next/navigation';

import { loadGroupBySlug } from '@/lib/finance/groups/load-group';
import { getServerClient } from '@/lib/supabase-server';

import { GroupReportsView } from './widgets/group-reports-view';
import type {
  GroupChargeRow,
  GroupExpenseRow,
  GroupPaymentRow,
  GroupReportData,
} from './widgets/group-report-types';

export const dynamic = 'force-dynamic';

interface Props {
  readonly params: Promise<{ slug: string }>;
}

interface RawPayment {
  readonly id: string;
  readonly charge_id: string | null;
  readonly payer_member_id: string | null;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  readonly source: string;
  readonly reverses_payment_id: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly created_at: string;
}

interface RawExpense {
  readonly id: string;
  readonly category_id: string | null;
  readonly payee: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: string;
  readonly reverses_expense_id: string | null;
  readonly incurred_at: string;
}

interface RawCharge {
  readonly id: string;
  readonly name: string;
  readonly shape: string;
}

interface RawObligation {
  readonly charge_id: string;
  readonly amount: number;
}

interface PayerMeta {
  readonly donor_name?: string;
  readonly payer_name?: string;
  readonly public_donation?: boolean;
  readonly public_ticket_purchase?: boolean;
}

/**
 * Group reports — the analytics surface for one event group.
 *
 * Loads flat and joins here rather than in the client, so the
 * dashboard widget stays a pure function of its rows and every panel
 * reduces the same arrays. The row caps are generous but real: a group
 * is one event, and a dashboard built from a truncated ledger would be
 * quietly wrong rather than loudly slow.
 *
 * The obligations query is what gives the "how close to target" panel
 * something to measure against; charges that raise none simply have no
 * target, which the view renders as an absence rather than as zero.
 */
export default async function GroupReportsPage({ params }: Props) {
  const { slug } = await params;
  const group = await loadGroupBySlug(slug);
  if (!group) notFound();

  const supabase = await getServerClient();
  const [
    { data: paymentsRaw },
    { data: expensesRaw },
    { data: chargesRaw },
    { data: categoriesRaw },
    { data: reconciliationsRaw },
  ] = await Promise.all([
    supabase
      .schema('finance')
      .from('payments')
      .select(
        'id, charge_id, payer_member_id, amount, currency, method, source, reverses_payment_id, metadata, created_at',
      )
      .eq('group_id', group.id)
      .order('created_at')
      .limit(5000),
    supabase
      .schema('finance')
      .from('expenses')
      .select('id, category_id, payee, amount, currency, status, reverses_expense_id, incurred_at')
      .eq('group_id', group.id)
      .order('incurred_at')
      .limit(2000),
    supabase.schema('finance').from('charges').select('id, name, shape').eq('group_id', group.id),
    supabase.schema('finance').from('expense_categories').select('id, name'),
    supabase.schema('finance').from('reconciliations').select('payment_id'),
  ]);

  const payments = (paymentsRaw ?? []) as RawPayment[];
  const expenses = (expensesRaw ?? []) as RawExpense[];
  const charges = (chargesRaw ?? []) as RawCharge[];

  const chargeIds = charges.map((c) => c.id);
  const { data: obligationsRaw } = chargeIds.length
    ? await supabase
        .schema('finance')
        .from('obligations')
        .select('charge_id, amount')
        .in('charge_id', chargeIds)
        .limit(20000)
    : { data: [] as RawObligation[] };

  const memberIds = Array.from(
    new Set(payments.map((p) => p.payer_member_id).filter((id): id is string => !!id)),
  );
  const { data: memberRows } = memberIds.length
    ? await supabase.schema('core').from('members').select('id, full_name').in('id', memberIds)
    : { data: [] as Array<{ id: string; full_name: string }> };

  const memberById = new Map(
    ((memberRows ?? []) as Array<{ id: string; full_name: string }>).map((m) => [
      m.id,
      m.full_name,
    ]),
  );
  const categoryById = new Map(
    ((categoriesRaw ?? []) as Array<{ id: string; name: string }>).map((c) => [c.id, c.name]),
  );
  const chargeById = new Map(charges.map((c) => [c.id, c]));
  const reconciledIds = new Set(
    ((reconciliationsRaw ?? []) as Array<{ payment_id: string }>).map((r) => r.payment_id),
  );

  const expectedByCharge = new Map<string, number>();
  for (const o of (obligationsRaw ?? []) as RawObligation[]) {
    expectedByCharge.set(o.charge_id, (expectedByCharge.get(o.charge_id) ?? 0) + Number(o.amount));
  }

  const paymentRows: GroupPaymentRow[] = payments.map((p) => {
    const meta = (p.metadata ?? {}) as PayerMeta;
    const memberName = p.payer_member_id ? memberById.get(p.payer_member_id) : null;
    const anonName = meta.donor_name ?? meta.payer_name ?? null;
    const charge = p.charge_id ? chargeById.get(p.charge_id) : null;
    return {
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      method: p.method,
      source: p.source,
      chargeId: p.charge_id,
      chargeName: charge?.name ?? 'Unassigned',
      chargeShape: charge?.shape ?? null,
      payerLabel:
        memberName ??
        anonName ??
        (meta.public_donation
          ? 'Anonymous donor'
          : meta.public_ticket_purchase
            ? 'Anonymous buyer'
            : '—'),
      isMember: !!memberName,
      isReversal: !!p.reverses_payment_id,
      reconciled: reconciledIds.has(p.id),
      createdAt: p.created_at,
    };
  });

  const expenseRows: GroupExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    amount: Number(e.amount),
    currency: e.currency,
    categoryName: (e.category_id ? categoryById.get(e.category_id) : null) ?? 'Uncategorised',
    payee: e.payee,
    status: e.status,
    isReversal: !!e.reverses_expense_id,
    incurredAt: e.incurred_at,
  }));

  const chargeRows: GroupChargeRow[] = charges.map((c) => ({
    id: c.id,
    name: c.name,
    shape: c.shape,
    expected: expectedByCharge.get(c.id) ?? 0,
  }));

  // A group lives under one scope and a scope has one currency, so the
  // first row that carries one settles it for the whole dashboard.
  const currency = paymentRows[0]?.currency ?? expenseRows[0]?.currency ?? 'XAF';

  const data: GroupReportData = {
    name: group.name,
    slug: group.slug,
    description: group.description,
    status: group.status,
    startsOn: group.startsOn,
    endsOn: group.endsOn,
    currency,
    payments: paymentRows,
    expenses: expenseRows,
    charges: chargeRows,
  };

  return <GroupReportsView data={data} />;
}
