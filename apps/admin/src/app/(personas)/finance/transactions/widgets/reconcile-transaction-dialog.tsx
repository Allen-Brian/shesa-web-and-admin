'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, Loader2 } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@shesa/ui';

import type { TransactionRow } from './transactions-types';

interface Props {
  readonly target: TransactionRow | null;
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (matchedRef: string, notes: string) => void;
}

/**
 * Compact reconcile dialog used by the row-action menu. Captures a
 * bank / MoMo / cash reference the operator matched the payment
 * against, plus optional notes. Blank both is allowed — sometimes the
 * operator just wants to flag a payment as seen.
 */
export function ReconcileTransactionDialog({ target, pending, onClose, onSubmit }: Props) {
  const [matchedRef, setMatchedRef] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setMatchedRef(target?.reconciliationMatchedRef ?? '');
    setNotes(target?.reconciliationNotes ?? '');
  }, [target]);

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-emerald-600" />
            Reconcile transaction
          </DialogTitle>
          <DialogDescription>
            Confirm this payment against the bank / MoMo / cash record it matches. The reference +
            notes are stored on the reconciliation row for audit; leave blank if you just want to
            flag it as reviewed.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold text-foreground tabular-nums">
                {new Intl.NumberFormat().format(target.amount)} {target.currency}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Payer</span>
              <span className="text-foreground">{target.payerLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">For</span>
              <span className="truncate text-foreground">{target.chargeName}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rec-ref">Matched reference (optional)</Label>
            <Input
              id="rec-ref"
              value={matchedRef}
              onChange={(e) => setMatchedRef(e.target.value)}
              placeholder="Bank ref, MoMo txn id, cash sheet line #"
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rec-notes">Notes (optional)</Label>
            <Textarea
              id="rec-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the next reconciler should know."
              rows={3}
              maxLength={1000}
            />
          </div>
        </div>

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
            onClick={() => onSubmit(matchedRef, notes)}
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Reconciling…
              </>
            ) : (
              <>
                <BadgeCheck className="h-3.5 w-3.5" />
                Mark reconciled
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
