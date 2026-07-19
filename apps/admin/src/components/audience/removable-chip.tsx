'use client';

import { X } from 'lucide-react';

import { Badge } from '@shesa/ui';

interface RemovableChipProps {
  readonly label: string;
  readonly onRemove: () => void;
}

/**
 * Small labelled Badge with an inline X remove button. Used inside the
 * audience Location group's selected-value chip row (countries / regions
 * / cities). Could be lifted to a more shared component if a third use
 * appears.
 */
export function RemovableChip({ label, onRemove }: RemovableChipProps) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      <span className="text-xs">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-sm p-0.5 hover:bg-background"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}
