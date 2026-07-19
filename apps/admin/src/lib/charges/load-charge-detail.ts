import 'server-only';

import { getServerClient } from '@/lib/supabase-server';

import { buildChargeSummary } from './build-charge-summary';
import type { RawCharge } from './charge-detail-raw-types';
import type { ChargeDetailData } from './charge-detail-types';
import { loadMatrixChargeDetail } from './load-matrix-charge-detail';
import { loadPoolChargeDetail } from './load-pool-charge-detail';

export type { ChargeDetailData } from './charge-detail-types';

/**
 * Shared server-side loader for the charge-detail drill-down.
 *
 * Both the Finance persona (/finance/charges/[id]) and the Exco
 * global-admin's read-only mirror (/exco/finance-view/charges/[id])
 * use this — keeping the query shape in one place avoids two subtly
 * divergent copies as the finance model grows.
 *
 * Returns `null` when the row is missing or invisible to the caller
 * (RLS + siloed admin lens). Pages should `notFound()` on null.
 *
 * The dispatch: `charge` and `fixed` shapes fan out to per-member
 * obligations and hit the matrix loader; everything else (goal /
 * open / ticketed / donation) is pool-shaped and settles directly
 * against the charge. The matrix loader also produces upcoming
 * periods, coverage totals, and the payment log; the pool loader
 * emphasises method + source aggregates for the reports tab.
 */
export async function loadChargeDetail(id: string): Promise<ChargeDetailData | null> {
  const supabase = await getServerClient();

  const { data: chargeRaw } = await supabase
    .schema('finance' as never)
    .from('charges' as never)
    .select(
      'id, scope_id, name, description, shape, base_amount, goal_amount, currency, recurrence, recurrence_interval, status, lifecycle, activation_date, open_date, close_date, created_at',
    )
    .eq('id', id)
    .maybeSingle();

  const charge = chargeRaw as RawCharge | null;
  if (!charge) return null;

  const { data: scopeRow } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, name, slug')
    .eq('id', charge.scope_id)
    .maybeSingle();

  const summary = buildChargeSummary(
    charge,
    scopeRow as { name: string; slug: string | null } | null,
  );

  const isObligationBased = charge.shape === 'charge' || charge.shape === 'fixed';
  return isObligationBased
    ? await loadMatrixChargeDetail(charge, summary)
    : await loadPoolChargeDetail(charge.id, summary);
}
