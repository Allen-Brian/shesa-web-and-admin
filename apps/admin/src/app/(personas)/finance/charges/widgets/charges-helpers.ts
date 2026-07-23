import type { ChargeRow, CreateForm, EditForm } from './charges-types';

/**
 * Fresh state for the "new charge" dialog. Owner scope isn't asked
 * for anymore — the parent view auto-derives it (mainstream for
 * Group charges; the operator's active scope for Individual ones).
 */
export function initialCreate(defaultScopeId: string): CreateForm {
  return {
    targetPartyType: 'member',
    scopeId: defaultScopeId,
    name: '',
    description: '',
    baseAmount: '',
    recurrence: 'monthly',
    activationDate: new Date().toISOString().slice(0, 10),
    chargeTargets: [],
  };
}

/**
 * "monthly" / "every 2 × quarterly" / "One-time" — the compact copy
 * shown as the subtitle in the Name column and inside the create
 * dialog's Recurrence select.
 */
export function formatRecurrence(recurrence: string, interval: number): string {
  if (recurrence === 'one_time') return 'One-time';
  const label =
    recurrence === 'biannual'
      ? 'bi-annually'
      : recurrence === 'quarterly'
        ? 'quarterly'
        : recurrence === 'yearly'
          ? 'yearly'
          : recurrence === 'monthly'
            ? 'monthly'
            : recurrence;
  return interval > 1 ? `every ${interval} × ${label}` : label;
}

/**
 * Snapshot a `ChargeRow` for the edit dialog. Every field is
 * carried over — the dialog itself decides which are editable based
 * on the charge's status (amount / recurrence / targets are
 * draft-only; the edge fn rejects any change to those once the
 * charge has been activated).
 */
export function toEditForm(row: ChargeRow): EditForm {
  const recurrence = ['one_time', 'monthly', 'quarterly', 'biannual', 'yearly'].includes(
    row.recurrence,
  )
    ? (row.recurrence as EditForm['recurrence'])
    : 'monthly';
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    activationDate: row.activationDate
      ? row.activationDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    status:
      row.status === 'draft' || row.status === 'active' || row.status === 'paused'
        ? row.status
        : 'draft',
    baseAmount: row.baseAmount != null ? String(row.baseAmount) : '',
    recurrence,
    targetPartyType: row.targetPartyType,
    currency: row.currency,
    chargeTargets: row.chargeTargets.map((t) => ({
      targetScopeId: t.targetScopeId,
      amount: t.amount,
    })),
  };
}
