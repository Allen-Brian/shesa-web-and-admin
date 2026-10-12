'use client';

import { MoreHorizontal, Sparkles, UserMinus } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shesa/ui';

import { ENGAGEMENT_TIERS, type EngagementTierValue, type SerialRow } from './members-table-types';

interface MemberRowActionsMenuProps {
  readonly row: SerialRow;
  readonly onRemove: () => void;
  readonly onSetEngagement: (tier: EngagementTierValue) => void;
}

export function MemberRowActionsMenu({
  row,
  onRemove,
  onSetEngagement,
}: MemberRowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-md p-0"
          aria-label="Row actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {row.membership_id && (
          <>
            <DropdownMenuLabel>Engagement</DropdownMenuLabel>
            {ENGAGEMENT_TIERS.map((tier) => (
              <DropdownMenuItem key={tier} onClick={() => onSetEngagement(tier)}>
                <Sparkles className="h-4 w-4" />
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onRemove}>
          <UserMinus className="h-4 w-4" />
          Remove from scope
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
