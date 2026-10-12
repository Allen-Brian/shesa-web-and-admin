'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Button, Input } from '@shesa/ui';

import type { GroupRow } from './song-widget-types';

interface Props {
  readonly group: GroupRow;
  readonly onSave: (id: string, name: string) => void;
  readonly onDelete: () => void;
  readonly pending: boolean;
}

export function GroupRowEditor({ group, onSave, onDelete, pending }: Props) {
  const [name, setName] = useState(group.name);
  const dirty = name.trim() !== group.name.trim();

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Group name"
        className="flex-1"
        maxLength={80}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!dirty || pending}
        onClick={() => onSave(group.id, name)}
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
    </div>
  );
}
