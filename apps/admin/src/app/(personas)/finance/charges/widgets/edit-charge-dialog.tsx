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

import type { EditForm } from './charges-types';

interface EditChargeDialogProps {
  readonly editing: EditForm | null;
  readonly onClose: () => void;
  readonly onChange: (patch: Partial<EditForm>) => void;
  readonly onSubmit: () => void;
  readonly pending: boolean;
}

/**
 * Edit dialog for an existing charge. Only the mutable metadata
 * (name / description / activation) and status transitions are here —
 * amount, currency, and recurrence are frozen once the charge exists
 * so any obligations already generated stay explainable.
 */
export function EditChargeDialog({
  editing,
  onClose,
  onChange,
  onSubmit,
  pending,
}: EditChargeDialogProps) {
  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit charge</DialogTitle>
          <DialogDescription>
            Only editable metadata + status transitions. Amount, currency, and recurrence are frozen
            once the charge exists so any obligations already generated stay explainable.
          </DialogDescription>
        </DialogHeader>
        {editing && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editing.name}
                onChange={(e) => onChange({ name: e.target.value })}
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                rows={2}
                value={editing.description}
                onChange={(e) => onChange({ description: e.target.value })}
                maxLength={2000}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-activation">Activation date</Label>
              <NativeDateInput
                id="edit-activation"
                value={editing.activationDate}
                onChange={(v) => onChange({ activationDate: v })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editing.status}
                onValueChange={(v) => onChange({ status: v as EditForm['status'] })}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onSubmit} disabled={pending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
