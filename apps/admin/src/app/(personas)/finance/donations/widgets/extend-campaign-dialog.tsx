'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  NativeDateInput,
  Textarea,
} from '@shesa/ui';

import type { CampaignRow } from './donations-types';

interface ExtendCampaignDialogProps {
  readonly target: CampaignRow | null;
  readonly onClose: () => void;
  readonly date: string;
  readonly onDateChange: (v: string) => void;
  readonly reason: string;
  readonly onReasonChange: (v: string) => void;
  readonly onSubmit: () => void;
  readonly pending: boolean;
}

/**
 * "Extend campaign" dialog. Sets a new close date past the current
 * one; the underlying server action inserts a contribution_extensions
 * row so the audit trail preserves who moved the goalposts and why.
 * Renders under `!!target` — passing `null` closes it.
 */
export function ExtendCampaignDialog({
  target,
  onClose,
  date,
  onDateChange,
  reason,
  onReasonChange,
  onSubmit,
  pending,
}: ExtendCampaignDialogProps) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Extend campaign</DialogTitle>
          <DialogDescription>
            Sets a new close date past the current one. Audited into contribution_extensions.
          </DialogDescription>
        </DialogHeader>
        {target && (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
              <div className="text-foreground">{target.name}</div>
              <div className="text-muted-foreground">
                Current close:{' '}
                {target.closeDate ? new Date(target.closeDate).toLocaleString() : '—'}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="extend-date">New close date</Label>
              <NativeDateInput id="extend-date" value={date} onChange={onDateChange} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="extend-reason">Reason (optional)</Label>
              <Textarea
                id="extend-reason"
                rows={2}
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
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
          <Button type="button" size="sm" onClick={onSubmit} loading={pending} disabled={pending}>
            Extend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
