'use client';

import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';

import { Button, Input } from '@shesa/ui';

interface Props {
  readonly onCreate: (name: string, reset: () => void) => void;
  readonly pending: boolean;
}

export function GroupRowCreator({ onCreate, pending }: Props) {
  const [name, setName] = useState('');
  const reset = () => setName('');

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-3">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New group name"
        className="flex-1"
        maxLength={80}
      />
      <Button
        type="button"
        size="sm"
        disabled={!name.trim() || pending}
        onClick={() => onCreate(name, reset)}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
        Add
      </Button>
      {name && (
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
