import { Archive, CalendarPlus, CircleCheck, Square } from 'lucide-react';

import { Button } from '@shesa/ui';

import type { ContributionRow } from './contributions-types';

interface ContributionRowActionsProps {
  readonly row: ContributionRow;
  readonly pending: boolean;
  readonly onApprove: (id: string) => void;
  readonly onClose: (id: string) => void;
  readonly onExtend: (row: ContributionRow) => void;
  readonly onArchive: (id: string) => void;
}

/**
 * Inline lifecycle-action buttons per row. Only the transitions
 * valid for the current lifecycle are rendered so a draft can't be
 * closed, an open can't be re-approved, etc. Icons carry the labels
 * via `title` so the row stays compact.
 */
export function ContributionRowActions({
  row,
  pending,
  onApprove,
  onClose,
  onExtend,
  onArchive,
}: ContributionRowActionsProps) {
  return (
    <div className="flex items-center gap-1">
      {row.lifecycle === 'draft' && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onApprove(row.id);
          }}
          loading={pending}
          disabled={pending}
          title="Approve → open"
        >
          <CircleCheck className="h-3.5 w-3.5" />
        </Button>
      )}
      {row.lifecycle === 'open' && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onClose(row.id);
          }}
          loading={pending}
          disabled={pending}
          title="Close now"
        >
          <Square className="h-3.5 w-3.5" />
        </Button>
      )}
      {(row.lifecycle === 'open' || row.lifecycle === 'closed') && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onExtend(row);
          }}
          loading={pending}
          disabled={pending}
          title="Extend"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
        </Button>
      )}
      {row.lifecycle !== 'archived' && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onArchive(row.id);
          }}
          loading={pending}
          disabled={pending}
          title="Archive"
        >
          <Archive className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
