'use client';

import { Button, Input, Label, Textarea } from '@shesa/ui';

interface ReasonDialogProps {
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
 * Small custom Dialog that lets the user type a reason / note before
 * confirming. Reusing ConfirmDialog would drop the input, so this
 * ships as its own primitive.
 */
export function ReasonDialog({
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
}: ReasonDialogProps) {
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
