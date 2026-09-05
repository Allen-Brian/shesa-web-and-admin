'use client';

import { Button, Input, Label, Textarea } from '@shesa/ui';

interface ProfileReasonDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly description: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly placeholder: string;
  readonly confirmLabel: string;
  readonly pending: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
 * Reason/note dialog for the member profile's Waive + Pay-on-behalf
 * actions. Grows the input to a Textarea once the value length passes a
 * threshold — a longer note deserves multi-line room. Duplicates the
 * manage-membership `ReasonDialog` shape rather than sharing (the two
 * live in different feature folders per the widgets-folder rule).
 */
export function ProfileReasonDialog({
  open,
  title,
  description,
  value,
  onChange,
  placeholder,
  confirmLabel,
  pending,
  onConfirm,
  onCancel,
}: ProfileReasonDialogProps) {
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
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor="reason">Details</Label>
          {value.length > 40 ? (
            <Textarea
              id="reason"
              rows={3}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              maxLength={500}
            />
          ) : (
            <Input
              id="reason"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              maxLength={500}
            />
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onConfirm} loading={pending} disabled={pending}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
