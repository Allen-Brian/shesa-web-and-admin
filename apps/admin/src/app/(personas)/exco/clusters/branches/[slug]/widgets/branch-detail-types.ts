import type { ScopeStatus } from '@/components/clusters/cluster-list';
import type { ExcoBadgeInfo } from '@/components/governance/exco-badge';
import type {
  GovernancePositionCatalogRow,
  GovernancePositionHolderRow,
  GovernanceRoleHolderRow,
} from '@/components/governance/governance-panel';
import type { GovernanceMemberPickerRow as SharedGovernanceMemberPickerRow } from '@/components/governance/assign-position-dialog';

export interface BranchChapterRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: ScopeStatus;
  readonly chapter_kind: 'autonomous' | 'grouping';
  readonly region: string;
  readonly city: string;
  readonly contact_email: string | null;
  readonly member_count: number;
}

export interface BranchMemberRow {
  readonly id: string;
  readonly member_id: string;
  readonly full_name: string;
  readonly badge: ExcoBadgeInfo | null;
  readonly batch_year: number | null;
  readonly network_name: string;
  readonly house_name: string;
  readonly membership_status: 'active' | 'passive' | 'pending';
  readonly location: string | null;
}

export type PositionCatalogRow = GovernancePositionCatalogRow;
export type PositionHolderRow = GovernancePositionHolderRow;
export type RoleHolderRow = GovernanceRoleHolderRow;
export type GovernanceMemberPickerRow = SharedGovernanceMemberPickerRow;

export type ChapterSerialRow = BranchChapterRow & { readonly serial: number };

export type ChapterConfirm = null | {
  readonly kind: 'archive' | 'restore';
  readonly targets: readonly ChapterSerialRow[];
};

export interface BranchGeography {
  readonly countryCode: string;
  readonly region: string;
  readonly city: string;
  readonly currencyCode: string;
}
