import { Copy, MoreHorizontal, Receipt as ReceiptIcon, Undo2 } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shesa/ui';

import type { PaymentRow } from './payments-types';

interface PaymentRowActionsProps {
  readonly row: PaymentRow;
  readonly canReverse: boolean;
  readonly hasReceipt: boolean;
  readonly pending: boolean;
  readonly onPreviewReceipt: (row: PaymentRow) => void;
  readonly onCopyVerifyUrl: (row: PaymentRow) => void;
  readonly onReverse: (row: PaymentRow) => void;
}

/**
 * Row overflow menu — receipt view / copy verify URL / reverse.
 * Nothing renders when the row has neither a receipt nor a valid
 * reversal path (a reversal row can't be re-reversed, so the menu is
 * empty). Row-click propagation is stopped so the drop-down doesn't
 * navigate the table.
 */
export function PaymentRowActions({
  row,
  canReverse,
  hasReceipt,
  pending,
  onPreviewReceipt,
  onCopyVerifyUrl,
  onReverse,
}: PaymentRowActionsProps) {
  if (!canReverse && !hasReceipt) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={(e) => e.stopPropagation()}
          disabled={pending}
          title="Row actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {hasReceipt && (
          <>
            <DropdownMenuItem onSelect={() => onPreviewReceipt(row)}>
              <ReceiptIcon className="h-4 w-4" />
              View / print receipt
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCopyVerifyUrl(row)}>
              <Copy className="h-4 w-4" />
              Copy verify URL
            </DropdownMenuItem>
            {canReverse && <DropdownMenuSeparator />}
          </>
        )}
        {canReverse && (
          <DropdownMenuItem
            onSelect={() => onReverse(row)}
            className="text-destructive focus:text-destructive"
          >
            <Undo2 className="h-4 w-4" />
            Reverse payment
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
