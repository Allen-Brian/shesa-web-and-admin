'use client';

import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@shesa/ui';

import type { TransferDestination } from './member-profile-types';

interface ProfileTransferDialogProps {
  readonly open: boolean;
  readonly memberName: string;
  readonly sourceName: string;
  readonly destinations: readonly TransferDestination[];
  readonly destinationId: string;
  readonly onDestinationChange: (id: string) => void;
  readonly reason: string;
  readonly onReasonChange: (v: string) => void;
  readonly pending: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ProfileTransferDialog({
  open,
  memberName,
  sourceName,
  destinations,
  destinationId,
  onDestinationChange,
  reason,
  onReasonChange,
  pending,
  onConfirm,
  onCancel,
}: ProfileTransferDialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-foreground">
          Transfer {memberName} out of {sourceName}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Creates a pending transfer request. The destination admin must approve — the flip is
          intentional, per M1 lock.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dest">Destination</Label>
            <Select value={destinationId} onValueChange={onDestinationChange}>
              <SelectTrigger id="dest">
                <SelectValue placeholder="Pick a branch or autonomous chapter" />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                    <span className="ml-2 text-xs text-muted-foreground">· {d.scope_type}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-reason">Reason (optional)</Label>
            <Textarea
              id="transfer-reason"
              rows={3}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Context for the destination admin"
              maxLength={500}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onConfirm} disabled={pending || !destinationId}>
            Request transfer
          </Button>
        </div>
      </div>
    </div>
  );
}
