import 'server-only';

import { getServerClient } from '@/lib/supabase-server';

import { buildChargeSummary } from './build-charge-summary';
import type { RawCharge } from './charge-detail-raw-types';
import type { ChargeDetailData } from './charge-detail-types';
import { loadMatrixChargeDetail } from './load-matrix-charge-detail';
import { loadPoolChargeDetail } from './load-pool-charge-detail';
import type { ChargeTargetPlanRow } from '@/app/(personas)/finance/charges/[id]/widgets/charge-detail-types';

export type { ChargeDetailData } from './charge-detail-types';

interface RawChargeTargetRow {
  readonly target_scope_id: string;
  readonly amount: number;
  readonly currency: string;
}

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
 *
 * When the charge is a Group charge (target_party_type='branch'), also
 * pulls the finance.charge_targets plan so the client can render a
 * plan-reference card above the matrix — useful for drafts, where no
 * obligations exist yet.
 */
export async function loadChargeDetail(id: string): Promise<ChargeDetailData | null> {
  const supabase = await getServerClient();

  const { data: chargeRaw } = await supabase
    .schema('finance')
    .from('charges')
    .select(
      'id, scope_id, name, description, shape, base_amount, goal_amount, currency, recurrence, recurrence_interval, status, lifecycle, activation_date, open_date, close_date, created_at, target_party_type',
    )
    .eq('id', id)
    .maybeSingle();

  const charge = chargeRaw as
    (RawCharge & { target_party_type: 'member' | 'branch' | null }) | null;
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

  const chargeTargets =
    charge.target_party_type === 'branch' ? await loadChargeTargets(id) : undefined;

  const isObligationBased = charge.shape === 'charge' || charge.shape === 'fixed';
  const detail = isObligationBased
    ? await loadMatrixChargeDetail(charge, summary)
    : await loadPoolChargeDetail(charge.id, summary);

  return { ...detail, chargeTargets };
}

async function loadChargeTargets(chargeId: string): Promise<readonly ChargeTargetPlanRow[]> {
  const supabase = await getServerClient();
  const { data: rows } = await supabase
    .schema('finance')
    .from('charge_targets')
    .select('target_scope_id, amount, currency')
    .eq('charge_id', chargeId);
  const targets = (rows ?? []) as RawChargeTargetRow[];
  if (targets.length === 0) return [];
  const scopeIds = targets.map((t) => t.target_scope_id);
  const { data: scopeRows } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, name, scope_type')
    .in('id', scopeIds);
  const scopesById = new Map(
    ((scopeRows ?? []) as Array<{ id: string; name: string; scope_type: string }>).map((s) => [
      s.id,
      s,
    ]),
  );
  return targets
    .map((t) => {
      const scope = scopesById.get(t.target_scope_id);
      return {
        targetScopeId: t.target_scope_id,
        targetName: scope?.name ?? '(unknown scope)',
        scopeType: scope?.scope_type ?? 'branch',
        amount: t.amount,
        currency: t.currency,
      };
    })
    .sort((a, b) => {
      if (a.scopeType !== b.scopeType) return a.scopeType.localeCompare(b.scopeType);
      return a.targetName.localeCompare(b.targetName);
    });
}
