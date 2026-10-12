import type { PaymentMethod } from '../donation-actions';

/**
 * Shared row + form shapes for the donations view. Kept in a plain
 * file so the server-side page loader (finance/donations/page.tsx) can
 * `import type` from a single source without pulling the client
 * widget bundle.
 */

export interface CampaignRow {
  readonly id: string;
  readonly scopeId: string;
  readonly scopeName: string;
  readonly currency: string;
  readonly name: string;
  readonly description: string | null;
  readonly lifecycle: string | null;
  readonly openDate: string | null;
  readonly closeDate: string | null;
  readonly status: string;
  readonly raised: number;
  readonly donationCount: number;
  readonly groupId: string | null;
  readonly groupName: string | null;
}

export interface DonationRow {
  readonly id: string;
  readonly campaignName: string;
  readonly scopeName: string;
  readonly donorLabel: string;
  /**
   * How to reach the donor — from the walk-in form for public gifts,
   * from `core.members` for member gifts. Carried so an exported
   * donations sheet can be thanked from directly.
   */
  readonly donorEmail: string | null;
  readonly donorPhone: string | null;
  readonly donorBatch: string | null;
  readonly donorMemberCode: string | null;
  readonly isMember: boolean;
  readonly isPublic: boolean;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  readonly reversesPaymentId: string | null;
  readonly isReversed: boolean;
  readonly createdAt: string;
  readonly groupId: string | null;
  readonly groupName: string | null;
}

export interface ScopeOption {
  readonly id: string;
  readonly name: string;
  readonly currency: string;
}

export type SerialCampaignRow = CampaignRow & { readonly serial: number };
export type SerialDonationRow = DonationRow & { readonly serial: number };

export type CampaignLifecycleFilter = 'all' | 'draft' | 'open' | 'closed' | 'archived';
export type DonorFilter = 'all' | 'member' | 'public' | 'walkin';

export interface NewCampaignForm {
  scopeId: string;
  name: string;
  description: string;
  openDate: string;
  closeDate: string;
}

export interface WalkInForm {
  campaignId: string;
  amount: string;
  method: PaymentMethod;
  donorName: string;
  donorEmail: string;
  memo: string;
}

/** Options shown in the walk-in dialog's method select. */
export const PAYMENT_METHODS: readonly { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'bank_transfer', label: 'Bank transfer' },
];
