'use client';

import { KeyRound, MoreHorizontal, UserMinus, UserPlus } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shesa/ui';

import type {
  GovernancePositionCatalogRow,
  GovernancePositionHolderRow,
  GovernanceRoleHolderRow,
  PositionTableRow,
} from './governance-types';

interface PositionRowActionsProps {
  readonly row: PositionTableRow;
  readonly catalogById: Map<string, GovernancePositionCatalogRow>;
  readonly holderById: Map<string, GovernancePositionHolderRow>;
  readonly roleById: Map<string, GovernanceRoleHolderRow>;
  readonly onAssignMember: (position: GovernancePositionCatalogRow) => void;
  readonly onRemoveHolder: (holder: GovernancePositionHolderRow) => void;
  readonly onGrantRole: (holder: GovernancePositionHolderRow) => void;
  readonly onRevokeRole: (role: GovernanceRoleHolderRow) => void;
}

/**
 * Single row's actions dropdown. Menu items shift based on state:
 *   vacant → Assign member
 *   holder + no role → Change holder · Grant role · Remove holder
 *   holder + role → Change holder · Revoke role · Remove holder
 */
export function PositionRowActions({
  row,
  catalogById,
  holderById,
  roleById,
  onAssignMember,
  onRemoveHolder,
  onGrantRole,
  onRevokeRole,
}: PositionRowActionsProps) {
  const catalog = catalogById.get(row.positionCatalogId);
  const holder = row.holder ? holderById.get(row.holder.assignmentId) : null;
  const role = row.role ? roleById.get(row.role.assignmentId) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {catalog && (
          <DropdownMenuItem onClick={() => onAssignMember(catalog)}>
            <UserPlus className="h-4 w-4" />
            {holder ? 'Change holder' : 'Assign member'}
          </DropdownMenuItem>
        )}
        {holder && !role && (
          <DropdownMenuItem onClick={() => onGrantRole(holder)} disabled={!holder.authUserId}>
            <KeyRound className="h-4 w-4" />
            Grant role
          </DropdownMenuItem>
        )}
        {holder && role && (
          <DropdownMenuItem onClick={() => onRevokeRole(role)}>
            <KeyRound className="h-4 w-4" />
            Revoke role
          </DropdownMenuItem>
        )}
        {holder && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onRemoveHolder(holder)}
            >
              <UserMinus className="h-4 w-4" />
              Remove holder
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
