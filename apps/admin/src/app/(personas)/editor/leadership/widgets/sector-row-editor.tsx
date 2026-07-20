'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Button, Input } from '@shesa/ui';

import type { SectorRow } from './types';

interface Props {
  readonly sector: SectorRow;
  readonly onSave: (id: string, name: string, caption: string) => void;
  readonly onDelete: () => void;
  readonly pending: boolean;
}

/**
 * Inline mini-editor for a single sector row inside the sectors
 * manager dialog. Tracks its own draft state; Save fires only when
 * the draft actually differs from the persisted row.
 */
export function SectorRowEditor({ sector, onSave, onDelete, pending }: Props) {
  const [name, setName] = useState(sector.name);
  const [caption, setCaption] = useState(sector.caption ?? '');
  const dirty =
    name.trim() !== sector.name.trim() || caption.trim() !== (sector.caption ?? '').trim();

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sector name"
          className="flex-1"
          maxLength={100}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!dirty || pending}
          onClick={() => onSave(sector.id, name, caption)}
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
