'use client';

import { Archive, EyeOff, Eye, Square } from 'lucide-react';

import { Button } from '@shesa/ui';

import type { GroupRow, GroupStatus } from './groups-types';

interface GroupRowActionsProps {
  readonly row: GroupRow;
  readonly pending: boolean;
  readonly onSetStatus: (id: string, status: GroupStatus) => void;
  readonly onToggleSidebar: (id: string, next: boolean) => void;
}

/**
 * Trailing action cluster on each group row. Shows only the actions
 * valid for the current state: active groups can close or archive,
 * closed groups can archive only, archived groups have no actions.
 * The sidebar toggle is always available on non-archived rows.
 */
export function GroupRowActions({
  row,
  pending,
  onSetStatus,
  onToggleSidebar,
}: GroupRowActionsProps) {
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  return (
    <div className="flex items-center gap-1">
      {row.status !== 'archived' && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={stop(() => onToggleSidebar(row.id, !row.showInSidebar))}
          loading={pending}
          disabled={pending}
          title={row.showInSidebar ? 'Hide from sidebar' : 'Show in sidebar'}
        >
          {row.showInSidebar ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      )}
      {row.status === 'active' && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={stop(() => onSetStatus(row.id, 'closed'))}
          loading={pending}
          disabled={pending}
          title="Close group"
        >
          <Square className="h-3.5 w-3.5" />
        </Button>
      )}
      {row.status !== 'archived' && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={stop(() => onSetStatus(row.id, 'archived'))}
          loading={pending}
          disabled={pending}
          title="Archive group"
        >
          <Archive className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
