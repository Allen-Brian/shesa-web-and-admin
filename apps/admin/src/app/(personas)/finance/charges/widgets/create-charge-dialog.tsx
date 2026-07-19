'use client';

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

import type { CreateForm, Recurrence, ScopeOption } from './charges-types';
import { RECURRENCES } from './charges-types';

interface CreateChargeDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly form: CreateForm;
  readonly onFormChange: (patch: Partial<CreateForm>) => void;
  readonly scopeOptions: readonly ScopeOption[];
  readonly onSubmit: () => void;
  readonly pending: boolean;
}

/**
 * "New charge" dialog. Every charge starts as a draft — activation
 * flips the hourly-sweep switch. Amount + currency + recurrence are
 * captured here and then frozen once the draft exists so any
 * obligations already generated stay explainable.
 */
export function CreateChargeDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  scopeOptions,
  onSubmit,
  pending,
}: CreateChargeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New charge</DialogTitle>
          <DialogDescription>
            A charge creates per-member obligations on its schedule. It starts as a draft; activate
            it when you&apos;re ready for the hourly sweep to fire.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="scope">Scope</Label>
            <Select value={form.scopeId} onValueChange={(v) => onFormChange({ scopeId: v })}>
              <SelectTrigger id="scope">
                <SelectValue placeholder="Pick a scope" />
              </SelectTrigger>
              <SelectContent>
                {scopeOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
              placeholder="e.g. Monthly Dues"
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              rows={2}
              value={form.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              placeholder="What this charge is for."
              maxLength={2000}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Base amount</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="1"
                value={form.baseAmount}
                onChange={(e) => onFormChange({ baseAmount: e.target.value })}
                placeholder="25000"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="recurrence">Recurrence</Label>
              <Select
                value={form.recurrence}
                onValueChange={(v) => onFormChange({ recurrence: v as Recurrence })}
              >
                <SelectTrigger id="recurrence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="activation">Activation date</Label>
            <NativeDateInput
              id="activation"
              value={form.activationDate}
              onChange={(v) => onFormChange({ activationDate: v })}
            />
            <span className="text-xs text-muted-foreground">
              The instant arrears begin. Obligations for the current period generate from here.
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onSubmit} disabled={pending}>
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
