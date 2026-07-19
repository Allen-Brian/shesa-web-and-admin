import type { MatrixCell } from './charge-detail-types';

export type CellStateKey =
  'paid' | 'partial' | 'open' | 'overdue' | 'waived' | 'cancelled' | 'upcoming' | 'not_applicable';

/**
 * Colour map keyed off the cell state. Explicit class strings so
 * Tailwind's JIT compiler picks them up — dynamic template classes
 * (`bg-${color}-500`) would silently drop out of the CSS build.
 */
export const CELL_DOT: Record<CellStateKey, string> = {
  paid: 'bg-emerald-500',
  partial: 'bg-amber-500',
  open: 'bg-sky-500',
  overdue: 'bg-destructive',
  waived: 'bg-sky-500',
  cancelled: 'bg-muted-foreground/40',
  upcoming: 'bg-slate-400 dark:bg-slate-500',
  not_applicable: 'bg-muted-foreground/30',
};

export const CELL_LABEL: Record<CellStateKey, string> = {
  paid: 'Paid',
  partial: 'Partial',
  open: 'Current',
  overdue: 'In arrears',
  waived: 'Waived',
  cancelled: 'Cancelled',
  upcoming: 'Upcoming',
  not_applicable: 'N/A',
};

/**
 * Derives the cell's visual state from its raw obligation fields.
 * `forgiven`/`cancelled` short-circuit; otherwise the paid vs owed
 * split decides paid/partial, and unpaid rows split into current vs
 * overdue based on period_end.
 */
export function deriveCellState(cell: MatrixCell): CellStateKey {
  if (cell.status === 'forgiven') return 'waived';
  if (cell.status === 'cancelled') return 'cancelled';
  const balance = cell.owed - cell.paid;
  if (balance <= 0.0001) return 'paid';
  if (cell.paid > 0) return 'partial';
  if (cell.periodEnd) {
    const end = new Date(cell.periodEnd).getTime();
    if (Number.isFinite(end) && end < Date.now()) return 'overdue';
  }
  return 'open';
}
