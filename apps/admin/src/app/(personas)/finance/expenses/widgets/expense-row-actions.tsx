import { CircleCheck, Undo2 } from 'lucide-react';

import { Button } from '@shesa/ui';

import type { ExpenseRow } from './expenses-types';

interface ExpenseRowActionsProps {
  readonly row: ExpenseRow;
  readonly pending: boolean;
  readonly onApprove: (id: string) => void;
  readonly onReverse: (row: ExpenseRow) => void;
}

/**
 * Row-inline actions: Approve for pending expenses; Reverse for
 * recorded / approved originals. Reversal rows themselves render
 * nothing — a reversal can't be reversed or re-approved.
 */
export function ExpenseRowActions({ row, pending, onApprove, onReverse }: ExpenseRowActionsProps) {
  if (row.reversesExpenseId) return null;
  const canApprove = row.status === 'pending_approval';
  const canReverse = (row.status === 'recorded' || row.status === 'approved') && !row.isReversed;
  if (!canApprove && !canReverse) return null;
  return (
    <div className="flex items-center gap-1">
      {canApprove && (
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
          title="Approve"
        >
          <CircleCheck className="h-3.5 w-3.5" />
          Approve
        </Button>
      )}
      {canReverse && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onReverse(row);
          }}
          loading={pending}
          disabled={pending}
          title="Reverse"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
