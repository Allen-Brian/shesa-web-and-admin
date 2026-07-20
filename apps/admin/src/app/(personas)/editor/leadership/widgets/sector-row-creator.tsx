'use client';

import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';

import { Button, Input } from '@shesa/ui';

interface Props {
  readonly onCreate: (name: string, caption: string, reset: () => void) => void;
  readonly pending: boolean;
}

/**
 * "New sector" strip pinned to the bottom of the sectors manager.
 * Locally-scoped draft; parent handles the actual create call and is
 * responsible for calling `reset()` when the row is committed.
 */
export function SectorRowCreator({ onCreate, pending }: Props) {
  const [name, setName] = useState('');
  const [caption, setCaption] = useState('');
  const reset = () => {
    setName('');
    setCaption('');
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New sector name"
          className="flex-1"
          maxLength={100}
        />
        <Button
          type="button"
          size="sm"
          disabled={!name.trim() || pending}
          onClick={() => onCreate(name, caption, reset)}
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
      </div>
      <Input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption (optional)"
        maxLength={200}
        className="text-xs"
      />
    </div>
  );
}
