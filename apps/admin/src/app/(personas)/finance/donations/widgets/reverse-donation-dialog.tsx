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

import type { DonationRow } from './donations-types';

interface ReverseDonationDialogProps {
  readonly target: DonationRow | null;
  readonly onClose: () => void;
  readonly reason: string;
  readonly onReasonChange: (v: string) => void;
  readonly onSubmit: () => void;
  readonly pending: boolean;
}

/**
 * "Reverse this donation?" dialog. Payments are append-only; a
 * reversal inserts a new row that cancels the original in the ledger
 * and treasury balance. The reason is required — it lands in the audit
 * trail so future admins can trace why a donation vanished from a
 * report.
 */
export function ReverseDonationDialog({
  target,
  onClose,
  reason,
  onReasonChange,
  onSubmit,
  pending,
}: ReverseDonationDialogProps) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reverse this donation?</DialogTitle>
          <DialogDescription>
            Payments are append-only. Reversal inserts a new row that cancels the original in the
            ledger + treasury balance. Reason is required.
          </DialogDescription>
        </DialogHeader>
        {target && (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
              <div className="text-sm text-foreground">
                {new Intl.NumberFormat().format(target.amount)} {target.currency}
              </div>
              <div className="text-muted-foreground">
                {target.donorLabel} · {target.campaignName}
              </div>
              <div className="text-muted-foreground">
                {new Date(target.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rv-reason">Reason</Label>
              <Textarea
                id="rv-reason"
                rows={3}
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="e.g. Donor asked us to refund"
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
