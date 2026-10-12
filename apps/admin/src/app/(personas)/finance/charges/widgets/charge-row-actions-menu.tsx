import { Archive, MoreHorizontal, Pencil, Send, Trash2 } from 'lucide-react';

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
  readonly onPublish: (row: ChargeRow) => void;
  readonly onArchive: (id: string) => void;
  readonly onDelete: (row: ChargeRow) => void;
}

/**
 * Row overflow menu — Publish (draft only) · Edit · Archive · Delete.
 * Publish is a status flip from draft → active; the update edge fn
 * auto-generates obligations across the charge's window on that
 * transition. Archived charges get no menu since there are no valid
 * transitions from that state.
 */
export function ChargeRowActionsMenu({
  row,
  pending,
  onEdit,
  onPublish,
  onArchive,
  onDelete,
}: ChargeRowActionsMenuProps) {
  if (row.status === 'archived') return null;
  const canPublish = row.status === 'draft';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={(e) => e.stopPropagation()}
          loading={pending}
          disabled={pending}
          title="Row actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {canPublish && (
          <DropdownMenuItem
            onSelect={() => onPublish(row)}
            className="text-primary focus:text-primary"
          >
            <Send className="h-4 w-4" />
            Publish
          </DropdownMenuItem>
        )}
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
