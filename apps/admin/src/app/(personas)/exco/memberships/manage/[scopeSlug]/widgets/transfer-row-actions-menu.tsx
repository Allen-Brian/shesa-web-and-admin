'use client';

import { Check, MoreHorizontal, X } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shesa/ui';

interface TransferRowActionsMenuProps {
  readonly disabled: boolean;
  readonly onApprove: () => void;
  readonly onDeny: () => void;
}

export function TransferRowActionsMenu({
  disabled,
  onApprove,
  onDeny,
}: TransferRowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-md p-0"
          aria-label="Row actions"
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onApprove}>
          <Check className="h-4 w-4" />
          Approve
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDeny}>
          <X className="h-4 w-4" />
          Deny
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
