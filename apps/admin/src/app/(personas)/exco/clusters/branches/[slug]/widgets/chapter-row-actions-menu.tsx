'use client';

import { Archive, MoreHorizontal, Pencil, RotateCcw } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@shesa/ui';

import type { ChapterSerialRow } from './branch-detail-types';

interface ChapterRowActionsMenuProps {
  readonly row: ChapterSerialRow;
  readonly onEdit: (row: ChapterSerialRow) => void;
  readonly onArchive: (row: ChapterSerialRow) => void;
  readonly onRestore: (row: ChapterSerialRow) => void;
}

export function ChapterRowActionsMenu({
  row,
  onEdit,
  onArchive,
  onRestore,
}: ChapterRowActionsMenuProps) {
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
