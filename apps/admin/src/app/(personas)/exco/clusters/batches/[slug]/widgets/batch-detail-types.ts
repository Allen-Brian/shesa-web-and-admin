import type { ExcoBadgeInfo } from '@/components/governance/exco-badge';

export interface BatchMemberRow {
  readonly id: string;
  readonly member_id: string;
  readonly member_code: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly badge: ExcoBadgeInfo | null;
  readonly house_name: string;
  readonly network_name: string;
  readonly branch_name: string | null;
  readonly membership_status: 'active' | 'passive' | 'pending' | null;
  readonly location: string | null;
}

export interface RefOption {
  readonly id: string;
  readonly name: string;
}

export type BatchMembersConfirmDelete = null | {
  readonly kind: 'single' | 'bulk';
  readonly targets: readonly BatchMemberRow[];
};
