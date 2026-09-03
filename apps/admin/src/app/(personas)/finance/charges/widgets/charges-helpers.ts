import type { ChargeRow, CreateForm, EditForm, TargetPartyType } from './charges-types';

/**
 * Fresh state for the "new charge" dialog. Neither the owner scope nor
 * the charge KIND is asked for — both are fixed by who the operator is
 * (Mainstream → group levies; a branch/chapter → individual member
 * charges). The parent view passes the already-decided `targetPartyType`
 * + its matching owner scope.
 */
export function initialCreate(scopeId: string, targetPartyType: TargetPartyType): CreateForm {
  return {
    targetPartyType,
    scopeId,
    name: '',
    description: '',
    baseAmount: '',
    recurrence: 'monthly',
    activationDate: new Date().toISOString().slice(0, 10),
    chargeTargets: [],
    targetDefaults: { branch: '', chapter: '', batch: '' },
  };
}

/**
 * "monthly" / "every 2 × quarterly" / "One-time" — the compact copy
 * shown as the subtitle in the Name column and inside the create
 * dialog's Recurrence select.
 */

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

// Re-exported from the shared formatters so this module keeps one import
// surface. These were local copies — formatMethod alone existed in five
// places, formatMoney in four.
export { formatRecurrence } from '@/lib/format/recurrence';
