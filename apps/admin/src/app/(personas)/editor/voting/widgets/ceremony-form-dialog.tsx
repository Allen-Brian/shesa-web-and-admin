'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  toast,
} from '@shesa/ui';
import { useState, useTransition } from 'react';

import { createCeremony, updateEdition, type CeremonyInput } from '../actions/voting-actions';
import type { EditionRow } from '../voting-types';
import { fromWatInput, toWatInput } from '../wat';

export type CeremonyDialogState =
  { readonly mode: 'create' } | { readonly mode: 'edit'; readonly edition: EditionRow };

/**
 * Create or rename a ceremony and set its two windows.
 *
 * The same dialog for both, because the fields are the same and a separate
 * create form drifts from the edit form the first time one gains a field.
 *
 * Weighting is deliberately absent. It has its own section on the ceremony's
 * Description tab, where there is room to explain what each mode does to the
 * result — a percentage pair in a create dialog is a decision made without
 * the consequence in view.
 */
export function CeremonyFormDialog({
  state,
  onOpenChange,
  onCreated,
}: {
  readonly state: CeremonyDialogState | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCreated?: (slug: string) => void;
}) {
  const editing = state?.mode === 'edit' ? state.edition : null;

  // Keyed on the edition id below, so switching rows remounts with fresh
  // defaults rather than carrying the previous ceremony's values across.
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [nomOpen, setNomOpen] = useState(toWatInput(editing?.nominationsOpenAt ?? null));
  const [nomClose, setNomClose] = useState(toWatInput(editing?.nominationsCloseAt ?? null));
  const [voteOpen, setVoteOpen] = useState(toWatInput(editing?.votingOpenAt ?? null));
  const [voteClose, setVoteClose] = useState(toWatInput(editing?.votingCloseAt ?? null));
  const [pending, startTransition] = useTransition();

  const save = () => {
    if (name.trim().length < 2) {
      toast.error('The ceremony needs a name.');
      return;
    }

    const input: CeremonyInput = {
      name,
      description: description || null,
      nominationsOpenAt: fromWatInput(nomOpen),
      nominationsCloseAt: fromWatInput(nomClose),
      votingOpenAt: fromWatInput(voteOpen),
      votingCloseAt: fromWatInput(voteClose),
    };

    startTransition(async () => {
      if (editing) {
        const res = await updateEdition(editing.id, input);
        if (!res.ok) {
          toast.error(res.message);
          return;
        }
        toast.success('Ceremony updated.');
        onOpenChange(false);
        return;
      }

      const res = await createCeremony(input);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Ceremony created. Add its awards next.');
      onOpenChange(false);
      if (res.slug) onCreated?.(res.slug);
    });
  };

  return (
    <Dialog open={state !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit ceremony' : 'New awards ceremony'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="SHESA Leadership Awards 2027"
              maxLength={200}
              autoFocus
            />
          </Field>

          <Field label="Description — shown on the public page">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nominations open">
              <Input
                type="datetime-local"
                value={nomOpen}
                onChange={(e) => setNomOpen(e.target.value)}
              />
            </Field>
            <Field label="Nominations close">
              <Input
                type="datetime-local"
                value={nomClose}
                onChange={(e) => setNomClose(e.target.value)}
              />
            </Field>
            <Field label="Voting opens">
              <Input
                type="datetime-local"
                value={voteOpen}
                onChange={(e) => setVoteOpen(e.target.value)}
              />
            </Field>
            <Field label="Voting closes">
              <Input
                type="datetime-local"
                value={voteClose}
                onChange={(e) => setVoteClose(e.target.value)}
              />
            </Field>
          </div>

          <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            All times are West Africa Time. The dates can be left blank and set later — the public
            site opens and closes itself from them, so nothing goes live until they are filled in
            and the ceremony is made live. Weighting is set on the ceremony&apos;s Description tab.
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create ceremony'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  readonly label: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
