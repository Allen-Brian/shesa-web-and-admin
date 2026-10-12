'use client';

import { Undo2 } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@shesa/ui';

import type { ExpenseRow } from './expenses-types';

interface ReverseExpenseDialogProps {
  readonly target: ExpenseRow | null;
  readonly onClose: () => void;
  readonly reason: string;
  readonly onReasonChange: (v: string) => void;
  readonly onSubmit: () => void;
  readonly pending: boolean;
}

/**
 * Reverse-expense confirmation. Inserts a new expense row that
 * cancels the original in the ledger + treasury balance; the reason
 * lands in the audit trail so a future auditor can trace why the
 * balance shifted.
 */
export function ReverseExpenseDialog({
  target,
  onClose,
  reason,
  onReasonChange,
  onSubmit,
  pending,
}: ReverseExpenseDialogProps) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reverse this expense?</DialogTitle>
          <DialogDescription>
            Inserts a new expense row that cancels the original in the ledger + treasury balance.
            Reason is required.
          </DialogDescription>
        </DialogHeader>
        {target && (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
              <div className="text-sm text-foreground">
                {new Intl.NumberFormat().format(target.amount)} {target.currency}
              </div>
              <div className="text-muted-foreground">
                {target.payee} · {target.scopeName}
                {target.categoryName && ` · ${target.categoryName}`}
              </div>
              <div className="text-muted-foreground">
                Incurred {new Date(target.incurredAt).toLocaleDateString()}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="e.g. Vendor refunded — event postponed"
                maxLength={500}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            loading={pending}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onSubmit}
            loading={pending}
            disabled={pending}
          >
            <Undo2 className="h-4 w-4" />
            Reverse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
