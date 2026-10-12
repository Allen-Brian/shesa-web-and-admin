import {
  BadgeCheck,
  Copy,
  MoreHorizontal,
  Receipt as ReceiptIcon,
  RotateCcw,
  Undo2,
} from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shesa/ui';

import type { TransactionRow } from './transactions-types';

interface TransactionRowActionsProps {
  readonly row: TransactionRow;
  readonly canReverse: boolean;
  readonly hasReceipt: boolean;
  readonly pending: boolean;
  readonly onPreviewReceipt: (row: TransactionRow) => void;
  readonly onCopyVerifyUrl: (row: TransactionRow) => void;
  readonly onReverse: (row: TransactionRow) => void;
  readonly onReconcile: (row: TransactionRow) => void;
  readonly onUndoReconciliation: (row: TransactionRow) => void;
}

/**
 * Row overflow menu — receipt view / copy verify URL / reverse.
 * Nothing renders when the row has neither a receipt nor a valid
 * reversal path (a reversal row can't be re-reversed, so the menu is
 * empty). Row-click propagation is stopped so the drop-down doesn't
 * navigate the table.
 */
export function TransactionRowActions({
  row,
  canReverse,
  hasReceipt,
  pending,
  onPreviewReceipt,
  onCopyVerifyUrl,
  onReverse,
  onReconcile,
  onUndoReconciliation,
}: TransactionRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={(e) => e.stopPropagation()}
          loading={pending}
          disabled={pending}
          title="Row actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {row.reconciled ? (
          <DropdownMenuItem onSelect={() => onUndoReconciliation(row)}>
            <RotateCcw className="h-4 w-4" />
            Undo reconciliation
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => onReconcile(row)}>
            <BadgeCheck className="h-4 w-4" />
            Mark reconciled
          </DropdownMenuItem>
        )}
        {hasReceipt && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onPreviewReceipt(row)}>
              <ReceiptIcon className="h-4 w-4" />
              View / print receipt
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCopyVerifyUrl(row)}>
              <Copy className="h-4 w-4" />
              Copy verify URL
            </DropdownMenuItem>
          </>
        )}
        {canReverse && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onReverse(row)}
              className="text-destructive focus:text-destructive"
            >
              <Undo2 className="h-4 w-4" />
              Reverse payment
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
