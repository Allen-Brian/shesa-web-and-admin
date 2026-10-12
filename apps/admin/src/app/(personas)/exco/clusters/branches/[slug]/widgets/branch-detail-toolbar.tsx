'use client';

import {
  Archive,
  Download,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  RotateCcw,
  Upload,
} from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@shesa/ui';

interface BranchDetailToolbarProps {
  readonly canUpdate: boolean;
  readonly isArchived: boolean;
  readonly pending: boolean;
  readonly onRefresh: () => void;
  readonly onImport: () => void;
  readonly onExport: () => void;
  readonly onEdit: () => void;
  readonly onArchive: () => void;
  readonly onRestore: () => void;
}

/**
 * Action-buttons row on the right of the Branch detail Tabs list:
 * Refresh + Import + Export + a more-menu with Edit + Archive/Restore.
 * Import + Edit + Archive/Restore hide when the viewer lacks update
 * permission; Refresh + Export are always available (read-only).
 */
export function BranchDetailToolbar({
  canUpdate,
  isArchived,
  pending,
  onRefresh,
  onImport,
  onExport,
  onEdit,
  onArchive,
  onRestore,
}: BranchDetailToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={onRefresh}>
        <RefreshCw className="h-4 w-4" />
        Refresh
      </Button>
      {canUpdate && (
        <Button type="button" size="sm" variant="outline" onClick={onImport}>
          <Upload className="h-4 w-4" />
          Import
        </Button>
      )}
      <Button type="button" size="sm" variant="outline" onClick={onExport}>
        <Download className="h-4 w-4" />
        Export
      </Button>
      {canUpdate && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 w-9 p-0"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {isArchived ? (
              <DropdownMenuItem onClick={onRestore}>
                <RotateCcw className="h-4 w-4" />
                Restore
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onArchive}
                disabled={pending}
              >
                <Archive className="h-4 w-4" />
                Archive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
