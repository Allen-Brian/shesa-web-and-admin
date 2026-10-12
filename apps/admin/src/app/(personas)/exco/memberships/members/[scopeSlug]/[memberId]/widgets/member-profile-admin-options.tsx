'use client';

import { ArrowLeftRight, Ban, Check, ChevronDown, HandCoins, Star, UserMinus } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shesa/ui';

import { ENGAGEMENT_TIERS, type EngagementTier } from '@shesa/domain/memberships';

import type {
  MembershipHistoryRow,
  ProfileDialogState,
  ProfilePermissions,
} from './member-profile-types';
import { ProfileAdminActionButton } from './profile-admin-action-button';

interface MemberProfileAdminOptionsProps {
  readonly permissions: ProfilePermissions;
  readonly viewerScopeName: string;
  readonly viewerMembership: MembershipHistoryRow | null;
  readonly needsMembershipDisabled: boolean;
  readonly transferDisabled: boolean;
  readonly pending: boolean;
  readonly onSetEngagement: (tier: EngagementTier) => void;
  readonly onOpenDialog: (state: NonNullable<ProfileDialogState>) => void;
}

/**
 * Admin Options section from the profile's right rail. Each button is
 * gated per-permission — permissions decide what renders; the Server
 * Action re-checks. Buttons that need a viewer-scope membership are
 * disabled when the member has none here.
 */
export function MemberProfileAdminOptions({
  permissions,
  viewerScopeName,
  viewerMembership,
  needsMembershipDisabled,
  transferDisabled,
  pending,
  onSetEngagement,
  onOpenDialog,
}: MemberProfileAdminOptionsProps) {
  return (
    <>
      {!viewerMembership && (
        <p className="text-xs text-muted-foreground">
          This member has no membership at {viewerScopeName}. Actions that need one are disabled.
        </p>
      )}

      {permissions.setEngagement && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-start"
              disabled={pending || needsMembershipDisabled}
            >
              <Star className="h-4 w-4" />
              Set engagement
              <ChevronDown className="ml-auto h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Tier</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ENGAGEMENT_TIERS.map((tier) => (
              <DropdownMenuItem
                key={tier}
                onSelect={() => onSetEngagement(tier)}
                disabled={pending}
              >
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
                {viewerMembership?.engagement === tier && (
                  <Check className="ml-auto h-3 w-3 opacity-60" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {permissions.markPaid && (
        <ProfileAdminActionButton
          label="Mark registration paid"
          Icon={Check}
          disabled={pending || needsMembershipDisabled}
          onClick={() => onOpenDialog({ kind: 'markPaid' })}
        />
      )}

      {permissions.waive && (
        <ProfileAdminActionButton
          label="Waive registration"
          Icon={Ban}
          disabled={pending || needsMembershipDisabled}
          onClick={() => onOpenDialog({ kind: 'waive' })}
        />
      )}

      {permissions.payOnBehalf && (
        <ProfileAdminActionButton
          label="Pay on behalf"
          Icon={HandCoins}
          disabled={pending || needsMembershipDisabled}
          onClick={() => onOpenDialog({ kind: 'payOnBehalf' })}
        />
      )}

      {permissions.transfer && (
        <ProfileAdminActionButton
          label="Initiate transfer"
          Icon={ArrowLeftRight}
          disabled={pending || transferDisabled}
          onClick={() => onOpenDialog({ kind: 'transfer' })}
        />
      )}

      {permissions.remove && (
        <ProfileAdminActionButton
          label="Remove from scope"
          Icon={UserMinus}
          disabled={pending || needsMembershipDisabled}
          onClick={() => onOpenDialog({ kind: 'remove' })}
          destructive
        />
      )}
    </>
  );
}
