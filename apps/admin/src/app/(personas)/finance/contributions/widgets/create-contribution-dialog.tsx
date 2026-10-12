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

import { amountLabelForShape } from './contributions-helpers';
import type { ContributionShape, CreateForm, ScopeOption } from './contributions-types';
import { SHAPES } from './contributions-types';

interface CreateContributionDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly form: CreateForm;
  readonly onFormChange: (patch: Partial<CreateForm>) => void;
  readonly scopeOptions: readonly ScopeOption[];
  readonly onSubmit: () => void;
  readonly pending: boolean;
}

/**
 * "New contribution" dialog. Shape select drives the visible fields —
 * `goal` / `fixed` / `ticketed` require an amount; `open` uses it as
 * an optional minimum; only `ticketed` shows the capacity input. Every
 * contribution starts as a draft.
 */
export function CreateContributionDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  scopeOptions,
  onSubmit,
  pending,
}: CreateContributionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New contribution</DialogTitle>
          <DialogDescription>
            Enters as draft. Approve to open the window and start accepting payments.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shape">Shape</Label>
            <Select
              value={form.shape}
              onValueChange={(v) => onFormChange({ shape: v as ContributionShape })}
            >
              <SelectTrigger id="shape">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHAPES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {SHAPES.find((s) => s.value === form.shape)?.help}
            </span>
          </div>
          <ScopeChip form={form} scopeOptions={scopeOptions} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
              placeholder="e.g. AGM Project Fund 2027"
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              rows={2}
              value={form.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              maxLength={2000}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">{amountLabelForShape(form.shape)}</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="1"
                value={form.amount}
                onChange={(e) => onFormChange({ amount: e.target.value })}
              />
            </div>
            {form.shape === 'ticketed' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="capacity">Capacity (optional)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.capacity}
                  onChange={(e) => onFormChange({ capacity: e.target.value })}
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="open-date">Open date</Label>
              <NativeDateInput
                id="open-date"
                value={form.openDate}
                onChange={(v) => onFormChange({ openDate: v })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="close-date">Close date</Label>
              <NativeDateInput
                id="close-date"
                value={form.closeDate}
                onChange={(v) => onFormChange({ closeDate: v })}
              />
            </div>
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
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScopeChip({
  form,
  scopeOptions,
}: {
  readonly form: CreateForm;
  readonly scopeOptions: readonly ScopeOption[];
}) {
  const scope = scopeOptions.find((s) => s.id === form.scopeId);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <span>Landing at</span>
      <span className="font-medium text-foreground">{scope?.name ?? 'your scope'}</span>
      <span>· currency</span>
      <span className="font-medium text-foreground">{scope?.currency ?? 'XAF'}</span>
    </div>
  );
}
