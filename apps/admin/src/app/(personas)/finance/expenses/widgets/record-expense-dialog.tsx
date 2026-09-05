'use client';

import { Plus } from 'lucide-react';

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
  NativeDateInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@shesa/ui';

import type { CategoryOption, RecordForm, ScopeOption } from './expenses-types';

interface RecordExpenseDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly form: RecordForm;
  readonly onFormChange: (patch: Partial<RecordForm>) => void;
  readonly scopeOptions: readonly ScopeOption[];
  readonly categoryOptions: readonly CategoryOption[];
  readonly willBePending: boolean;
  readonly onSubmit: () => void;
  readonly pending: boolean;
}

/**
 * "Record an expense" dialog. Below the scope's threshold the
 * expense hits the ledger immediately; above it enters
 * `pending_approval` — the amber hint under the amount field warns
 * before submit so the operator isn't surprised by the outcome.
 * Amount + every other field are frozen once recorded — corrections
 * are reversal rows, not edits.
 */
export function RecordExpenseDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  scopeOptions,
  categoryOptions,
  willBePending,
  onSubmit,
  pending,
}: RecordExpenseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record an expense</DialogTitle>
          <DialogDescription>
            Money out of a scope&apos;s treasury. Amount and every other field are frozen once
            recorded — corrections are reversal rows, not edits.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scope">Scope</Label>
            <Select value={form.scopeId} onValueChange={(v) => onFormChange({ scopeId: v })}>
              <SelectTrigger id="scope">
                <SelectValue placeholder="Pick a scope" />
              </SelectTrigger>
              <SelectContent>
                {scopeOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.currency}
                    {s.threshold != null &&
                      ` · threshold ${new Intl.NumberFormat().format(s.threshold)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payee">Payee</Label>
            <Input
              id="payee"
              value={form.payee}
              onChange={(e) => onFormChange({ payee: e.target.value })}
              placeholder="e.g. Community Hall"
              maxLength={200}
            />
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
                placeholder="12000"
              />
              {willBePending && (
                <span className="text-xs text-amber-700 dark:text-amber-400">
                  ≥ threshold — will enter pending_approval.
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => onFormChange({ categoryId: v })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              rows={2}
              value={form.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              placeholder="What this expense is for."
              maxLength={2000}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incurred">Incurred date</Label>
            <NativeDateInput
              id="incurred"
              value={form.incurredAt}
              onChange={(v) => onFormChange({ incurredAt: v })}
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
            <Plus className="h-4 w-4" />
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
