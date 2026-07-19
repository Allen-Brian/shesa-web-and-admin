'use client';

import { Archive, MoreHorizontal, Pencil, Send, Trash2 } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shesa/ui';

import type { SerialRow } from './list-types';

interface RowActionsMenuProps {
  readonly row: SerialRow;
  readonly onPublish: (r: SerialRow) => void;
  readonly onEdit: (r: SerialRow) => void;
  readonly onArchive: (r: SerialRow) => void;
  readonly onDelete: (r: SerialRow) => void;
}

export function RowActionsMenu({
  row,
  onPublish,
  onEdit,
  onArchive,
  onDelete,
}: RowActionsMenuProps) {
  const isDraftOrScheduled = row.status === 'draft' || row.status === 'scheduled';
  const canArchive = row.status !== 'archived';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {isDraftOrScheduled && (
          <>
            <DropdownMenuItem onSelect={() => onPublish(row)}>
              <Send className="mr-2 h-4 w-4" />
              Publish
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={() => onEdit(row)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        {canArchive && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onArchive(row)}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(row)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
