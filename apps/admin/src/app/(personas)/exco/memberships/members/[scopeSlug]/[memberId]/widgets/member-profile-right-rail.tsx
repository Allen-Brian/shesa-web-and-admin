'use client';

import type { EngagementTier } from '@shesa/domain/memberships';

import type {
  MembershipHistoryRow,
  ProfileDialogState,
  ProfilePermissions,
} from './member-profile-types';
import { MemberProfileAdminOptions } from './member-profile-admin-options';
import { ProfileEngagementBadge } from './profile-engagement-badge';
import { ProfileSection } from './profile-section';

interface MemberProfileRightRailProps {
  readonly permissions: ProfilePermissions;
  readonly viewerScopeName: string;
  readonly viewerMembership: MembershipHistoryRow | null;
  readonly currentAffiliation: MembershipHistoryRow | null;
  readonly needsMembershipDisabled: boolean;
  readonly transferDisabled: boolean;
  readonly pending: boolean;
  readonly onSetEngagement: (tier: EngagementTier) => void;
  readonly onOpenDialog: (state: NonNullable<ProfileDialogState>) => void;
}

/**
 * Right rail — Admin options (permission-gated section) + Engagement
 * (current tier at viewer scope, or elsewhere) + Household (placeholder).
 */
export function MemberProfileRightRail({
  permissions,
  viewerScopeName,
  viewerMembership,
  currentAffiliation,
  needsMembershipDisabled,
  transferDisabled,
  pending,
  onSetEngagement,
  onOpenDialog,
}: MemberProfileRightRailProps) {
  const anyPermission =
    permissions.setEngagement ||
    permissions.markPaid ||
    permissions.waive ||
    permissions.payOnBehalf ||
    permissions.transfer ||
    permissions.remove;

  return (
    <aside className="flex flex-col gap-4">
      {anyPermission && (
        <ProfileSection title="Admin options">
          <MemberProfileAdminOptions
            permissions={permissions}
            viewerScopeName={viewerScopeName}
            viewerMembership={viewerMembership}
            needsMembershipDisabled={needsMembershipDisabled}
            transferDisabled={transferDisabled}
            pending={pending}
            onSetEngagement={onSetEngagement}
            onOpenDialog={onOpenDialog}
          />
        </ProfileSection>
      )}

      <ProfileSection title="Engagement">
        {viewerMembership ? (
          <div className="flex flex-col gap-1 text-sm">
            <div className="text-muted-foreground">Current tier at {viewerScopeName}</div>
            <ProfileEngagementBadge tier={viewerMembership.engagement} />
          </div>
        ) : currentAffiliation ? (
          <div className="flex flex-col gap-1 text-sm">
            <div className="text-muted-foreground">Elsewhere: {currentAffiliation.scope_name}</div>
            <ProfileEngagementBadge tier={currentAffiliation.engagement} />
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            No active membership to show engagement for.
          </div>
        )}
      </ProfileSection>

      <ProfileSection title="Household">
        <div className="text-xs text-muted-foreground">
          Household surface lands with the households epic.
        </div>
      </ProfileSection>
    </aside>
  );
}
