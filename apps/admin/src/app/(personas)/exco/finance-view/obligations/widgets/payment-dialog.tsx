'use client';

import { CreditCard } from 'lucide-react';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@shesa/ui';

import { PaymentSummary } from './payment-summary';
import {
  PAYMENT_METHOD_OPTIONS,
  type PaymentDraft,
  type PaymentMethod,
} from './obligation-widget-types';

interface PaymentDialogProps {
  readonly draft: PaymentDraft | null;
  readonly pending: boolean;
  readonly onChange: (next: PaymentDraft) => void;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

/**
 * Dialog used to settle (or partially settle) an obligation. Displays
 * the row summary, then amount + method + optional external ref + memo.
 */
export function PaymentDialog({
  draft,
  pending,
  onChange,
  onClose,
  onConfirm,
}: PaymentDialogProps) {
  const open = draft !== null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        {draft ? (
          <>
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
              <DialogDescription>
                Settle an obligation your branch owes. Payments land as a manual entry with you as
                the recorder.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <PaymentSummary draft={draft} />

              <div className="flex flex-col gap-2">
                <Label htmlFor="pay-amount">Amount ({draft.row.currency})</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min="0"
                  step="1"
                  value={draft.amount}
                  onChange={(e) => onChange({ ...draft, amount: e.target.value })}
                />
                {draft.row.outstanding > 0 && (
                  <div className="flex gap-2 text-[10px]">
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() =>
                        onChange({ ...draft, amount: draft.row.outstanding.toString() })
                      }
                    >
                      Pay remaining (
                      {new Intl.NumberFormat().format(Math.round(draft.row.outstanding))})
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() =>
                        onChange({
                          ...draft,
                          amount: Math.round(draft.row.outstanding / 2).toString(),
                        })
                      }
                    >
                      Pay half
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="pay-method">Method</Label>
                <Select
                  value={draft.method}
                  onValueChange={(v) => onChange({ ...draft, method: v as PaymentMethod })}
                >
                  <SelectTrigger id="pay-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="pay-ref">External reference (optional)</Label>
                <Input
                  id="pay-ref"
                  value={draft.externalRef}
                  onChange={(e) => onChange({ ...draft, externalRef: e.target.value })}
                  placeholder="Transaction id, receipt no., bank slip…"
                  maxLength={200}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="pay-memo">Note (optional)</Label>
                <Textarea
                  id="pay-memo"
                  rows={2}
                  value={draft.memo}
                  onChange={(e) => onChange({ ...draft, memo: e.target.value })}
                  placeholder="Anything the treasurer should know."
                  maxLength={500}
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
                onClick={onConfirm}
                loading={pending}
                disabled={pending}
                className="gap-1.5"
              >
                <CreditCard className="h-4 w-4" />
                Record payment
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
