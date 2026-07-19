'use client';

import { ArrowDown, Ban, Check, HandCoins, MoreHorizontal } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shesa/ui';

import {
  isSettledRegistration,
  type RegistrationConfirmState,
  type SerialRegistrationRow,
} from './registration-row-types';

interface RegistrationRowActionsMenuProps {
  readonly row: SerialRegistrationRow;
  readonly setConfirm: (c: RegistrationConfirmState) => void;
}

export function RegistrationRowActionsMenu({ row, setConfirm }: RegistrationRowActionsMenuProps) {
  const isSettled = isSettledRegistration(row.registration_state);
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
        <DropdownMenuLabel>Registration</DropdownMenuLabel>
        <DropdownMenuItem
          disabled={isSettled}
          onClick={() => setConfirm({ kind: 'markPaid', target: row })}
        >
          <Check className="h-4 w-4" />
          Mark paid
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isSettled}
          onClick={() => setConfirm({ kind: 'payOnBehalf', target: row })}
        >
          <HandCoins className="h-4 w-4" />
          Pay on behalf
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isSettled}
          onClick={() => setConfirm({ kind: 'waive', target: row })}
        >
          <Ban className="h-4 w-4" />
          Waive
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Governance</DropdownMenuLabel>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          disabled={row.membership_status !== 'active'}
          onClick={() => setConfirm({ kind: 'escalate', target: row })}
        >
          <ArrowDown className="h-4 w-4" />
          Move to passive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
