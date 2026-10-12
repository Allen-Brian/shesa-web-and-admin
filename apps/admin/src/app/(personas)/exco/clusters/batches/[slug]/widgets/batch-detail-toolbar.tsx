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

interface BatchDetailToolbarProps {
  readonly isArchived: boolean;
  readonly canManageMembers: boolean;
  readonly canUpdate: boolean;
  readonly pending: boolean;
  readonly onRefresh: () => void;
  readonly onOpenImport: () => void;
  readonly onExport: () => void;
  readonly onOpenEdit: () => void;
  readonly onOpenArchive: () => void;
  readonly onOpenRestore: () => void;
}

/**
 * Right-hand toolbar that sits next to the Members/Governance tab list.
 * Refresh + Export are always visible; Import shows when the viewer can
 * manage members and the batch is live; the kebab (Edit/Archive/Restore)
 * shows only when `canUpdate`.
 */
export function BatchDetailToolbar({
  isArchived,
  canManageMembers,
  canUpdate,
  pending,
  onRefresh,
  onOpenImport,
  onExport,
  onOpenEdit,
  onOpenArchive,
  onOpenRestore,
}: BatchDetailToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={onRefresh}>
        <RefreshCw className="h-4 w-4" />
        Refresh
      </Button>
      {canManageMembers && !isArchived && (
        <Button type="button" size="sm" variant="outline" onClick={onOpenImport}>
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
            <DropdownMenuItem onClick={onOpenEdit}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {isArchived ? (
              <DropdownMenuItem onClick={onOpenRestore}>
                <RotateCcw className="h-4 w-4" />
                Restore
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onOpenArchive}
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
