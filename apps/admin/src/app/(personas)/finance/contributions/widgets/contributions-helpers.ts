import type { CreateForm } from './contributions-types';

/**
 * Fresh state for the "new contribution" dialog — goal shape, one-month
 * window, and the owner scope preselected server-side (the parent
 * view auto-picks the operator's active finance scope so the form
 * never asks).
 */
export function initialCreate(defaultScopeId: string): CreateForm {
  return {
    scopeId: defaultScopeId,
    shape: 'goal',
    name: '',
    description: '',
    amount: '',
    capacity: '',
    openDate: new Date().toISOString().slice(0, 10),
    closeDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  };
}

/** +7 days from the current close as the default new-close suggestion. */
export function suggestExtendedCloseDate(currentCloseIso: string | null): string {
  if (!currentCloseIso) return '';
  const cur = new Date(currentCloseIso).getTime();
  if (!Number.isFinite(cur)) return '';
  return new Date(cur + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * Amount label the create dialog shows above the amount input,
 * varying by shape ("Goal amount" / "Unit price" / "Base amount" /
 * "Minimum amount (optional)").
 */
export function amountLabelForShape(shape: CreateForm['shape']): string {
  if (shape === 'goal') return 'Goal amount';
  if (shape === 'ticketed') return 'Unit price';
  if (shape === 'fixed') return 'Base amount';
  return 'Minimum amount (optional)';
}
