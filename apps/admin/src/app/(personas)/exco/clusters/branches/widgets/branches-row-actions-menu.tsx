'use client';

import { Archive, MoreHorizontal, Pencil, RotateCcw } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@shesa/ui';

import type { BranchesSerialRow } from './branches-list-types';

interface BranchesRowActionsMenuProps {
  readonly row: BranchesSerialRow;
  readonly onEdit: (row: BranchesSerialRow) => void;
  readonly onArchive: (row: BranchesSerialRow) => void;
  readonly onRestore: (row: BranchesSerialRow) => void;
}

/**
 * Kebab menu for a branch row. Chapter rows never render this — their
 * actions live on the chapter detail page. When the row is already
 * archived, the destructive Archive action is swapped for Restore.
 */
export function BranchesRowActionsMenu({
  row,
  onEdit,
  onArchive,
  onRestore,
}: BranchesRowActionsMenuProps) {
  const isArchived = row.status === 'archived';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-md p-0"
          aria-label="Row actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => onEdit(row)}>
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        {isArchived ? (
          <DropdownMenuItem onClick={() => onRestore(row)}>
            <RotateCcw className="h-4 w-4" />
            Restore
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onArchive(row)}
          >
            <Archive className="h-4 w-4" />
            Archive
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
