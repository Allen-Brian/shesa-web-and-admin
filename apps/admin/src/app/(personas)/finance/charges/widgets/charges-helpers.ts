import type { ChargeRow, CreateForm, EditForm, ScopeOption } from './charges-types';

/** Fresh state for the "new charge" dialog — first scope preselected. */
export function initialCreate(scopeOptions: readonly ScopeOption[]): CreateForm {
  return {
    targetPartyType: 'member',
    scopeId: scopeOptions[0]?.id ?? '',
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
 * Snapshot the mutable subset of a `ChargeRow` for the edit dialog.
 * Amount / currency / recurrence are frozen once the charge exists
 * (per the "obligations already generated must stay explainable"
 * lock), so they don't appear in `EditForm`.
 */
export function toEditForm(row: ChargeRow): EditForm {
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
  };
}
