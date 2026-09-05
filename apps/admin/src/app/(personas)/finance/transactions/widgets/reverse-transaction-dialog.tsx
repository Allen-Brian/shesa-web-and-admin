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

import { formatMethod } from './transactions-helpers';
import type { TransactionRow } from './transactions-types';

interface ReverseTransactionDialogProps {
  readonly target: TransactionRow | null;
  readonly onClose: () => void;
  readonly reason: string;
  readonly onReasonChange: (v: string) => void;
  readonly onSubmit: () => void;
  readonly pending: boolean;
}

/**
 * Reverse-payment confirmation dialog. Payments are append-only —
 * this dialog inserts a new row (a `reverses_payment_id` link back
 * to the original) that cancels the original in the ledger + treasury
 * balance. The reason lands in the audit trail so a future auditor
 * can trace why the balance shifted.
 */
export function ReverseTransactionDialog({
  target,
  onClose,
  reason,
  onReasonChange,
  onSubmit,
  pending,
}: ReverseTransactionDialogProps) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reverse this payment?</DialogTitle>
          <DialogDescription>
            Payments are append-only. Reversal inserts a new row that cancels the original in the
            ledger + treasury balance. Reason is required and lands in the audit trail.
          </DialogDescription>
        </DialogHeader>
        {target && (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
              <div className="text-sm text-foreground">
                {new Intl.NumberFormat().format(target.amount)} {target.currency}
              </div>
              <div className="text-muted-foreground">
                {target.payerLabel} · {target.chargeName} · {formatMethod(target.method)}
              </div>
              <div className="text-muted-foreground">
                {new Date(target.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="e.g. Provider double-charged the payer"
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
