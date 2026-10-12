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

import type { ContributionRow } from './contributions-types';

interface ExtendContributionDialogProps {
  readonly target: ContributionRow | null;
  readonly onClose: () => void;
  readonly date: string;
  readonly onDateChange: (v: string) => void;
  readonly reason: string;
  readonly onReasonChange: (v: string) => void;
  readonly onSubmit: () => void;
  readonly pending: boolean;
}

/**
 * Extend-contribution dialog. Every extension is audited into
 * `finance.contribution_extensions` with the who / when / why, so
 * the reason is optional but strongly encouraged.
 */
export function ExtendContributionDialog({
  target,
  onClose,
  date,
  onDateChange,
  reason,
  onReasonChange,
  onSubmit,
  pending,
}: ExtendContributionDialogProps) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Extend contribution</DialogTitle>
          <DialogDescription>
            Sets a new close date past the current one. Every extension is audited into
            finance.contribution_extensions with the who / when / why.
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
