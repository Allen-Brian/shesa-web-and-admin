import type { ChargeSummary } from '@/app/(personas)/finance/charges/[id]/widgets/charge-detail-types';

import type { RawCharge } from './charge-detail-raw-types';

interface ScopeRow {
  readonly name: string;
  readonly slug: string | null;
}

/**
 * Fold the raw charge row + its scope row into the `ChargeSummary`
 * the detail view consumes. Both `finance` and `exco` persona
 * loaders funnel through here so the mapping stays consistent.
 */
export function buildChargeSummary(charge: RawCharge, scopeRow: ScopeRow | null): ChargeSummary {
  return {
    id: charge.id,
    name: charge.name,
    description: charge.description,
    scopeId: charge.scope_id,
    scopeName: scopeRow?.name ?? '—',
    scopeSlug: scopeRow?.slug ?? '',
    shape: charge.shape,
    baseAmount: charge.base_amount ? charge.base_amount : null,
    goalAmount: charge.goal_amount ? parseFloat(charge.goal_amount) : null,
    currency: charge.currency,
    recurrence: charge.recurrence,
    recurrenceInterval: charge.recurrence_interval,
    status: charge.status,
    lifecycle: charge.lifecycle,
    activationDate: charge.activation_date,
    openDate: charge.open_date,
    closeDate: charge.close_date,
    createdAt: charge.created_at,
  };
}
