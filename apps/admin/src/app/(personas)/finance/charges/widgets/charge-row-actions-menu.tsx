import { Archive, MoreHorizontal, Pencil, Play, RefreshCw } from 'lucide-react';

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
  readonly onActivate: (id: string) => void;
  readonly onGenerate: (id: string) => void;
  readonly onArchive: (id: string) => void;
}

/**
 * Row overflow menu — edit / activate (drafts) / generate obligations
 * (active) / archive. Archived charges get no menu at all since there
 * are no valid transitions from that state. Click propagation is
 * stopped so the underlying row-click that opens the charge detail
 * page doesn't fire.
 */
export function ChargeRowActionsMenu({
  row,
  pending,
  onEdit,
  onActivate,
  onGenerate,
  onArchive,
}: ChargeRowActionsMenuProps) {
  if (row.status === 'archived') return null;
  const canActivate = row.status === 'draft';
  const canGenerate = row.status === 'active';
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
          Edit details
        </DropdownMenuItem>
        {canActivate && (
          <DropdownMenuItem onSelect={() => onActivate(row.id)}>
            <Play className="h-4 w-4" />
            Activate
          </DropdownMenuItem>
        )}
        {canGenerate && (
          <DropdownMenuItem onSelect={() => onGenerate(row.id)}>
            <RefreshCw className="h-4 w-4" />
            Generate obligations
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => onArchive(row.id)}
          className="text-destructive focus:text-destructive"
        >
          <Archive className="h-4 w-4" />
          Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
