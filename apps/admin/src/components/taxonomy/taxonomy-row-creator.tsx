'use client';

import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';

import { Button, Input } from '@shesa/ui';

import type { TaxonomyDraft } from './taxonomy-types';

interface Props {
  /** Singular, capitalised — "Category", "Sector". Drives the placeholder. */
  readonly noun: string;
  readonly nameMaxLength: number;
  /** True to show the caption field, matching the row editor above it. */
  readonly withCaption: boolean;
  readonly captionPlaceholder?: string;
  readonly onCreate: (draft: TaxonomyDraft, reset: () => void) => void;
  readonly pending: boolean;
}

/**
 * "New row" strip pinned to the bottom of a taxonomy manager. Draft
 * state is local; the parent performs the create and calls `reset()`
 * once the row is committed.
 */
export function TaxonomyRowCreator({
  noun,
  nameMaxLength,
  withCaption,
  captionPlaceholder,
  onCreate,
  pending,
}: Props) {
  const [name, setName] = useState('');
  const [caption, setCaption] = useState('');
  const lower = noun.toLowerCase();

  const reset = () => {
    setName('');
    setCaption('');
  };

  const nameField = (
    <Input
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder={`New ${lower} name`}
      className="flex-1"
      maxLength={nameMaxLength}
    />
  );

  const buttons = (
    <>
      <Button
        type="button"
        size="sm"
        disabled={!name.trim() || pending}
        onClick={() => onCreate({ name, caption }, reset)}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
        Add
      </Button>
      {(name || caption) && (
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </>
  );

  if (!withCaption) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-3">
        {nameField}
        {buttons}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        {nameField}
        {buttons}
      </div>
      <Input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder={captionPlaceholder ?? 'Caption (optional)'}
        maxLength={200}
        className="text-xs"
      />
    </div>
  );
}
