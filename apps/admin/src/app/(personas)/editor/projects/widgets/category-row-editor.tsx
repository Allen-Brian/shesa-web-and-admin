'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Button, Input } from '@shesa/ui';

import type { CategoryRow } from './types';

interface Props {
  readonly category: CategoryRow;
  readonly onSave: (id: string, name: string) => void;
  readonly onDelete: () => void;
  readonly pending: boolean;
}

/**
 * Inline mini-editor for a single project category. Save button
 * enables only when the draft actually differs from the persisted
 * name.
 */
export function CategoryRowEditor({ category, onSave, onDelete, pending }: Props) {
  const [name, setName] = useState(category.name);
  const dirty = name.trim() !== category.name.trim();

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        className="flex-1"
        maxLength={80}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!dirty || pending}
        onClick={() => onSave(category.id, name)}
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
