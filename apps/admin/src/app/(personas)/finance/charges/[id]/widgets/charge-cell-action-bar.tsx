'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BanknoteArrowUp, HandCoins } from 'lucide-react';

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@shesa/ui';

import { forgiveObligation, recordObligationPayment } from '../charge-detail-actions';

type PaymentMethod = 'mtn_momo' | 'orange_money' | 'cash' | 'bank_transfer' | 'card';

const METHOD_OPTIONS: readonly { readonly value: PaymentMethod; readonly label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
];

/**
 * State-dependent action controls for the cell sheet. Rendered only
 * when the viewer holds the matching permission and the obligation is
 * still open/partial/overdue (a paid, waived, or cancelled cell is
 * view-only). "Record payment" settles the arrears via a manual
 * payment; "Waive" forgives the remainder (sensitive tier).
 */
export function ChargeCellActionBar({
  obligationId,
  outstanding,
  currency,
  canRecordPayment,
  canForgive,
  onDone,
}: {
  readonly obligationId: string;
  readonly outstanding: number;
  readonly currency: string;
  readonly canRecordPayment: boolean;
  readonly canForgive: boolean;
  readonly onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<'none' | 'pay' | 'waive'>('none');

  const [amount, setAmount] = useState(outstanding > 0 ? String(Math.round(outstanding)) : '');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [memo, setMemo] = useState('');
  const [reason, setReason] = useState('');

  const submitPayment = () => {
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) return toast.error('Enter a positive amount.');
    startTransition(async () => {
      const res = await recordObligationPayment({
        obligationId,
        amount: value,
        currency,
        method,
        memo: memo.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Payment recorded.');
      router.refresh();
      onDone();
    });
  };

  const submitWaive = () => {
    if (!reason.trim()) return toast.error('A reason is required to waive.');
    startTransition(async () => {
      const res = await forgiveObligation({ obligationId, reason: reason.trim() });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Obligation waived.');
      router.refresh();
      onDone();
    });
  };

  if (mode === 'pay') {
    return (
      <div className="flex flex-col gap-2.5 rounded-lg border border-border p-3">
        <span className="text-xs font-medium text-foreground">Record payment</span>
        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="h-9"
          />
          <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHOD_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Memo (optional)"
          className="h-9"
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode('none')}
            loading={pending}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={submitPayment} loading={pending} disabled={pending}>
            Record
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'waive') {
    return (
      <div className="flex flex-col gap-2.5 rounded-lg border border-border p-3">
        <span className="text-xs font-medium text-foreground">Waive this obligation</span>
        <p className="text-xs text-muted-foreground">
          Forgiveness writes off the balance as forgone income. It cannot be undone — record a
          payment instead if money was collected.
        </p>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required)"
          className="h-9"
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode('none')}
            loading={pending}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={submitWaive}
            loading={pending}
            disabled={pending}
          >
            Waive
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canRecordPayment && (
        <Button size="sm" onClick={() => setMode('pay')} className="gap-1.5">
          <BanknoteArrowUp className="h-3.5 w-3.5" />
          Record payment
        </Button>
      )}
      {canForgive && (
        <Button variant="outline" size="sm" onClick={() => setMode('waive')} className="gap-1.5">
          <HandCoins className="h-3.5 w-3.5" />
          Waive
        </Button>
      )}
    </div>
  );
}
