'use client';

import { Clock, Minus } from 'lucide-react';

import type { MatrixCell } from './charge-detail-types';
import { CELL_DOT, CELL_LABEL, deriveCellState } from './shared-cell-state';
import { formatMoney } from './shared-formatters';

interface ScopeBodyMatrixCellProps {
  readonly cell: MatrixCell | null;
  readonly isUpcoming: boolean;
  readonly isCurrent?: boolean;
}

/**
 * One cell in the branch × period matrix. Compact by design — a
 * coloured dot + one-line paid/owed summary — so 20 rows × 12
 * columns fit on a laptop screen without horizontal scroll. The
 * current-period cell tints its background primary-5 so the active
 * column reads at a glance in a dense row.
 *
 * Hover surfaces the full amount + status label via the native
 * `title` attribute; row-level drill-down (the payment log) opens
 * from the row's expand caret.
 */
export function ScopeBodyMatrixCell({ cell, isUpcoming, isCurrent }: ScopeBodyMatrixCellProps) {
  const containerBase =
    'flex h-12 items-center justify-center rounded-md ' + (isCurrent ? 'bg-primary/5' : '');

  if (isUpcoming) {
    return (
      <div className={`${containerBase} text-muted-foreground/60`} title="Upcoming — not yet due">
        <Clock className="h-3.5 w-3.5" />
      </div>
    );
  }
  if (!cell) {
    return (
      <div className={`${containerBase} text-muted-foreground/40`} title="N/A — pre-enrolment">
        <Minus className="h-3.5 w-3.5" />
      </div>
    );
  }

  const state = deriveCellState(cell);
  const remaining = Math.max(0, cell.owed - cell.paid);
  const settled = state === 'paid' || state === 'waived' || state === 'cancelled';
  const tooltip = settled
    ? `${CELL_LABEL[state]} — ${formatMoney(cell.owed, cell.currency)}`
    : `${CELL_LABEL[state]} — ${formatMoney(cell.paid, cell.currency)} of ${formatMoney(cell.owed, cell.currency)} · ${formatMoney(remaining, cell.currency)} left`;

  return (
    <div
      title={tooltip}
      className={
        'flex h-12 flex-col items-center justify-center gap-1 rounded-md hover:bg-muted/40 ' +
        (isCurrent ? 'bg-primary/5' : '')
      }
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${CELL_DOT[state]}`} />
      <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
        {settled ? '✓' : `${Math.round((cell.paid / (cell.owed || 1)) * 100)}%`}
      </span>
    </div>
  );
}
