'use client';

import { useEffect, useState } from 'react';

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
} from '@shesa/ui';

interface SaveFilterTemplateDialogProps {
  readonly open: boolean;
  readonly onCancel: () => void;
  readonly onSave: (name: string) => void;
}

/**
 * Small dialog for naming a new audience filter template. Replaces the
 * legacy `window.prompt` — proper focus management + keyboard support +
 * consistent visual language with the rest of the admin UI.
 */
export function SaveFilterTemplateDialog({
  open,
  onCancel,
  onSave,
}: SaveFilterTemplateDialogProps) {
  const [name, setName] = useState('');

  // Reset the input when the dialog is (re)opened so the previous entry
  // doesn't linger.
  useEffect(() => {
    if (open) setName('');
  }, [open]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        className="max-w-md"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Save filter template</DialogTitle>
          <DialogDescription>
            Give this audience combination a name so you can reuse it later.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-template-name">Name</Label>
          <Input
            id="filter-template-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bamenda alumni, batch 2010"
            maxLength={100}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
