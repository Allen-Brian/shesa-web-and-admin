'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Button, Input } from '@shesa/ui';

import type { SectorRow } from './types';

interface Props {
  readonly sector: SectorRow;
  readonly onSave: (id: string, name: string) => void;
  readonly onDelete: () => void;
  readonly pending: boolean;
}

/** Inline editor for a single organ sector. */
export function SectorRowEditor({ sector, onSave, onDelete, pending }: Props) {
  const [name, setName] = useState(sector.name);
  const dirty = name.trim() !== sector.name.trim();

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Sector name"
        className="flex-1"
        maxLength={80}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!dirty || pending}
        onClick={() => onSave(sector.id, name)}
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
