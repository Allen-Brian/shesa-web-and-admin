'use client';

import { ChevronRight } from 'lucide-react';

import type { BranchesSerialRow } from './branches-list-types';

interface BranchesSerialCellProps {
  readonly row: BranchesSerialRow;
  readonly isExpanded: boolean;
  readonly onToggle: (branchId: string) => void;
}

/**
 * Serial-column cell. On a branch row: renders the branch's row number
 * plus a chevron toggle when children exist. On a chapter row: blank —
 * chapters inherit the parent's number visually via indentation.
 */
export function BranchesSerialCell({ row, isExpanded, onToggle }: BranchesSerialCellProps) {
  if (row._kind === 'chapter') {
    return <span className="text-muted-foreground" aria-hidden />;
  }
  return (
    <span className="flex items-center gap-1.5">
      {row._has_children ? (
        <button
          type="button"
          aria-label={isExpanded ? 'Collapse chapters' : 'Expand chapters'}
          aria-expanded={isExpanded}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(row.id);
          }}
          className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </button>
      ) : (
        <span className="inline-block h-6 w-6" aria-hidden />
      )}
      <span>{row.serial}</span>
    </span>
  );
}
