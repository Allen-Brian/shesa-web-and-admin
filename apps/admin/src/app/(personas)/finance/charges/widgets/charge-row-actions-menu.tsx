import { Archive, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shesa/ui';

import type { ChargeRow } from './charges-types';

interface ChargeRowActionsMenuProps {
  readonly row: ChargeRow;
  readonly pending: boolean;
  readonly onEdit: (row: ChargeRow) => void;
  readonly onArchive: (id: string) => void;
  readonly onDelete: (row: ChargeRow) => void;
}

/**
 * Row overflow menu — Edit / Archive / Delete. Activation happens
 * inside the edit dialog as a status flip (draft → active), and the
 * update edge fn auto-generates obligations on that transition, so
 * neither shows up here as its own item. Archived charges get no
 * menu since there are no valid transitions from that state.
 */
export function ChargeRowActionsMenu({
  row,
  pending,
  onEdit,
  onArchive,
  onDelete,
}: ChargeRowActionsMenuProps) {
  if (row.status === 'archived') return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={(e) => e.stopPropagation()}
          disabled={pending}
          title="Row actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => onEdit(row)}>
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onArchive(row.id)}>
          <Archive className="h-4 w-4" />
          Archive
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => onDelete(row)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
