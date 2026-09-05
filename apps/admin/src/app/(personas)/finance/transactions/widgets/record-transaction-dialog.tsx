'use client';

import { CircleDollarSign } from 'lucide-react';

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
} from '@shesa/ui';

import type { PaymentMethod } from '../transaction-actions';
import type { ChargeOption, RecordForm } from './transactions-types';
import { PAYMENT_METHODS } from './transactions-types';

interface RecordTransactionDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly form: RecordForm;
  readonly onFormChange: (patch: Partial<RecordForm>) => void;
  readonly chargeOptions: readonly ChargeOption[];
  readonly onSubmit: () => void;
  readonly pending: boolean;
}

/**
 * Record-a-payment dialog. Manual entry path for cash / bank /
 * wallet transfers that didn't come in through a gateway. External
 * ref field carries a bank slip # or MoMo transaction id into the
 * ledger so reconciliation can trace back to the source document.
 */
export function RecordTransactionDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  chargeOptions,
  onSubmit,
  pending,
}: RecordTransactionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            For contributions, donations, and one-off collections. Dues-obligation payments
            (pay-on-behalf for a specific member) land on the Members page.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="charge">Charge</Label>
            <Select value={form.chargeId} onValueChange={(v) => onFormChange({ chargeId: v })}>
              <SelectTrigger id="charge">
                <SelectValue placeholder="Pick a charge" />
              </SelectTrigger>
              <SelectContent>
                {chargeOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} · {c.scopeName} · {c.currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {chargeOptions.length === 0 && (
              <span className="text-xs text-muted-foreground">
                No active charges are available at scopes you can see. Create one first.
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="1"
                value={form.amount}
                onChange={(e) => onFormChange({ amount: e.target.value })}
                placeholder="25000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="method">Method</Label>
              <Select
                value={form.method}
                onValueChange={(v) => onFormChange({ method: v as PaymentMethod })}
              >
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="memo">Memo (optional)</Label>
            <Input
              id="memo"
              value={form.memo}
              onChange={(e) => onFormChange({ memo: e.target.value })}
              placeholder="Note for the receipt / audit"
              maxLength={500}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="external">External reference (optional)</Label>
            <Input
              id="external"
              value={form.externalRef}
              onChange={(e) => onFormChange({ externalRef: e.target.value })}
              placeholder="Bank slip # or MoMo transaction id"
              maxLength={200}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            loading={pending}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onSubmit} loading={pending} disabled={pending}>
            <CircleDollarSign className="h-4 w-4" />
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
