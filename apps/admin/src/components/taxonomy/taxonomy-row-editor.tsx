'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Button, Input } from '@shesa/ui';

import type { TaxonomyDraft, TaxonomyRow } from './taxonomy-types';

interface Props {
  readonly row: TaxonomyRow;
  /** Singular, capitalised — "Category", "Sector". Drives the placeholder. */
  readonly noun: string;
  readonly nameMaxLength: number;
  /** Omit to hide the caption field entirely. */
  readonly caption?: string;
  readonly captionPlaceholder?: string;
  readonly onSave: (id: string, draft: TaxonomyDraft) => void;
  readonly onDelete: () => void;
  readonly pending: boolean;
}

/**
 * Inline mini-editor for one taxonomy row. Tracks its own draft state;
 * Save enables only once the draft differs from the persisted row.
 */
export function TaxonomyRowEditor({
  row,
  noun,
  nameMaxLength,
  caption,
  captionPlaceholder,
  onSave,
  onDelete,
  pending,
}: Props) {
  const withCaption = caption !== undefined;
  const [name, setName] = useState(row.name);
  const [draftCaption, setDraftCaption] = useState(caption ?? '');

  const dirty =
    name.trim() !== row.name.trim() ||
    (withCaption && draftCaption.trim() !== (caption ?? '').trim());

  const nameField = (
    <Input
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder={`${noun} name`}
      className="flex-1"
      maxLength={nameMaxLength}
    />
  );

  const buttons = (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!dirty || pending}
        onClick={() => onSave(row.id, { name, caption: draftCaption })}
      >
        <Pencil className="h-3.5 w-3.5" />
        Save
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </>
  );

  // Without a caption the row is a single line; with one it stacks, so
  // the caption gets the full width rather than competing with the
  // buttons for it.
  if (!withCaption) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
        {nameField}
        {buttons}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        {nameField}
        {buttons}
      </div>
      <Input
        value={draftCaption}
        onChange={(e) => setDraftCaption(e.target.value)}
        placeholder={captionPlaceholder ?? 'Caption (optional)'}
        maxLength={200}
        className="text-xs"
      />
    </div>
  );
}
