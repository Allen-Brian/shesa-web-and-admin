import { notFound, redirect } from 'next/navigation';

import { loadChargeDetail } from '@/lib/charges/load-charge-detail';
import { loadChargeRules } from '@/lib/charges/load-charge-rules';
import { getServerClient } from '@/lib/supabase-server';

import { ChargeDetailView } from './widgets/charge-detail-view';

export const dynamic = 'force-dynamic';

interface Props {
  readonly params: Promise<{ id: string }>;
}

/**
 * Charge detail — the "who has paid" drill-down.
 *
 * Data loading lives in a shared server helper so the Exco read-only
 * mirror (/exco/finance-view/charges/[id]) can render the same view
 * without diverging query paths.
 */
export default async function ChargeDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/finance/charges/${id}`);

  const data = await loadChargeDetail(id);
  if (!data) notFound();

  // Gate the cell sheet's mutating actions to what the caller may do at
  // the charge's scope. payment.record settles an arrears cell;
  // obligation.forgive (sensitive, per-person) waives it. The Exco
  // mirror never sets these, so it stays read-only.
  const [{ data: canRecordPayment }, { data: canForgive }] = await Promise.all([
    supabase.schema('core').rpc('has_permission', {
      p_user_id: user.id,
      p_scope_id: data.summary.scopeId,
      p_permission_key: 'payment.record',
    }),
    supabase.schema('core').rpc('has_permission', {
      p_user_id: user.id,
      p_scope_id: data.summary.scopeId,
      p_permission_key: 'obligation.forgive',
    }),
  ]);

  // Member rules (exceptions) only apply to individual (member-fanned)
  // charges; load them so Finance can manage tiers/exemptions inline.
  const rules =
    data.mode === 'matrix' && data.variant === 'members'
      ? await loadChargeRules(id, data.summary.scopeId, data.summary.currency, user.id)
      : undefined;

  return (
    <ChargeDetailView
      {...data}
      backLinkHref="/finance/charges"
      actions={{ canRecordPayment: !!canRecordPayment, canForgive: !!canForgive }}
      rules={rules}
    />
  );
}
