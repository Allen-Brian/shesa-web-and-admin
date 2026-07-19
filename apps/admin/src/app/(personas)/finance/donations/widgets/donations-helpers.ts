import type { CampaignRow, NewCampaignForm, ScopeOption, WalkInForm } from './donations-types';

/** Human label for the payment method enum used in tables + selects. */
export function formatMethod(method: string): string {
  switch (method) {
    case 'cash':
      return 'Cash';
    case 'mtn_momo':
      return 'MTN MoMo';
    case 'orange_money':
      return 'Orange Money';
    case 'bank_transfer':
      return 'Bank transfer';
    case 'card':
      return 'Card';
    default:
      return method;
  }
}

/**
 * Fresh state for the "new campaign" dialog — first scope option
 * pre-selected, today as the open date, one year out as the default
 * close so operators only tweak the fields that differ.
 */
export function initialNewCampaign(scopeOptions: readonly ScopeOption[]): NewCampaignForm {
  return {
    scopeId: scopeOptions[0]?.id ?? '',
    name: '',
    description: '',
    openDate: new Date().toISOString().slice(0, 10),
    closeDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  };
}

/**
 * Fresh state for the walk-in donation dialog — pre-selects the first
 * open campaign so the dialog is one field away from usable.
 */
export function initialWalkIn(activeCampaigns: readonly CampaignRow[]): WalkInForm {
  return {
    campaignId: activeCampaigns[0]?.id ?? '',
    amount: '',
    method: 'cash',
    donorName: '',
    donorEmail: '',
    memo: '',
  };
}

/** Default new close date suggestion for the extend dialog (+30d). */
export function suggestExtendedCloseDate(currentCloseIso: string | null): string {
  if (!currentCloseIso) return '';
  const cur = new Date(currentCloseIso).getTime();
  if (!Number.isFinite(cur)) return '';
  return new Date(cur + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
}
