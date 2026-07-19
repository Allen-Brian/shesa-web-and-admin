import type { ExcoBadgeInfo } from '@/components/governance/exco-badge';

export interface MemberProfile {
  readonly id: string;
  readonly full_name: string;
  readonly badge: ExcoBadgeInfo | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly batch_year: number | null;
  readonly batch_name: string | null;
  readonly network_name: string | null;
  readonly house_name: string | null;
  readonly current_country: string | null;
  readonly current_region_state: string | null;
  readonly current_city: string | null;
  readonly entry_year: number | null;
  readonly exit_year: number | null;
  readonly member_status: string;
  readonly field: string | null;
}

export interface MembershipHistoryRow {
  readonly id: string;
  readonly scope_id: string;
  readonly scope_name: string;
  readonly scope_slug: string;
  readonly scope_type: string;
  readonly status: string;
  readonly engagement: 'dormant' | 'normal' | 'engaged' | 'committed' | 'pillar';
  readonly join_method: string;
  readonly joined_at: string | null;
  readonly approved_at: string | null;
  readonly left_at: string | null;
  readonly transferred_at: string | null;
  readonly registration_state: 'not_required' | 'pending' | 'paid' | 'paid_on_behalf' | 'waived';
  readonly registration_note: string | null;
  readonly is_active: boolean;
}

export interface TransferDestination {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly scope_type: 'branch' | 'chapter';
}

export interface ProfilePermissions {
  readonly setEngagement: boolean;
  readonly markPaid: boolean;
  readonly waive: boolean;
  readonly payOnBehalf: boolean;
  readonly transfer: boolean;
  readonly remove: boolean;
}

export type ProfileDialogState =
  | null
  | { readonly kind: 'markPaid' }
  | { readonly kind: 'waive' }
  | { readonly kind: 'payOnBehalf' }
  | { readonly kind: 'transfer' }
  | { readonly kind: 'remove' };
