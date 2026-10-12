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

import type { NewCampaignForm, ScopeOption } from './donations-types';

interface NewCampaignDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly form: NewCampaignForm;
  readonly onFormChange: (patch: Partial<NewCampaignForm>) => void;
  readonly scopeOptions: readonly ScopeOption[];
  readonly onSubmit: () => void;
  readonly pending: boolean;
}

/**
 * New donation-campaign dialog. Every campaign is created as a draft;
 * the campaigns table exposes an Approve action that flips it open.
 * The two-step flow means Finance can hold on a scope + name + window
 * without wiring the campaign into the public website prematurely.
 */
export function NewCampaignDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  scopeOptions,
  onSubmit,
  pending,
}: NewCampaignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New donation campaign</DialogTitle>
          <DialogDescription>
            Enters as draft. Approve to open it for donations from the website + walk-ins.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-scope">Scope</Label>
            <Select value={form.scopeId} onValueChange={(v) => onFormChange({ scopeId: v })}>
              <SelectTrigger id="new-scope">
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-name">Name</Label>
            <Input
              id="new-name"
              value={form.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
              placeholder="e.g. Shesa Buea General Fund"
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-description">Description (optional)</Label>
            <Textarea
              id="new-description"
              rows={2}
              value={form.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              maxLength={2000}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-open">Open date</Label>
              <NativeDateInput
                id="new-open"
                value={form.openDate}
                onChange={(v) => onFormChange({ openDate: v })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-close">Close date</Label>
              <NativeDateInput
                id="new-close"
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
