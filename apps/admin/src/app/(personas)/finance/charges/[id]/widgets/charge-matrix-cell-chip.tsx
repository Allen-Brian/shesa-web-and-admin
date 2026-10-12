import { Clock } from 'lucide-react';

import type { MatrixCell } from './charge-detail-types';
import { CELL_DOT, CELL_LABEL, deriveCellState } from './shared-cell-state';
import { formatMoney } from './shared-formatters';

/**
 * Coloured chip rendered inside every matrix cell that has an actual
 * obligation. Shows state (paid / partial / current / in-arrears / …)
 * plus the money split. Settled + closed states show one number
 * ("owed"); active states show a paid/owed split. Pro-rated cells add
 * a `·pro-rated` accent so operators know why the amount looks off.
 */
export function ChargeMatrixCellChip({ cell }: { cell: MatrixCell }) {
  const state = deriveCellState(cell);
  const settledOrClosed =
    state === 'paid' || state === 'waived' || state === 'cancelled' || state === 'not_applicable';

  return (
    <div className="flex flex-col gap-1 leading-tight">
      <span className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-foreground">
        <span className={`h-2 w-2 shrink-0 rounded-full ${CELL_DOT[state]}`} />
        {CELL_LABEL[state]}
      </span>
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {settledOrClosed
          ? formatMoney(cell.owed, cell.currency)
          : `${formatMoney(cell.paid, cell.currency)} / ${formatMoney(cell.owed, cell.currency)}`}
        {cell.prorated && <span className="ml-1">·pro-rated</span>}
      </span>
    </div>
  );
}

/**
 * Placeholder chip for a period that hasn't landed yet — auto-added
 * to the matrix so operators can see what's coming without running
 * the obligation generator first.
 */
export function ChargeMatrixUpcomingChip() {
  return (
    <div className="flex flex-col gap-1 leading-tight opacity-70">
      <span className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Clock className="h-3 w-3" />
        Upcoming
      </span>
      <span className="text-[11px] italic text-muted-foreground">not yet due</span>
    </div>
  );
}

/**
 * Placeholder chip for a period that ended before the member's
 * enrolment — so they legitimately owe nothing. Reads better than a
 * dash for accounting eyes.
 */
export function ChargeMatrixNotApplicableChip() {
  return (
    <div className="flex flex-col gap-1 leading-tight opacity-70">
      <span className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <span className={`h-2 w-2 shrink-0 rounded-full ${CELL_DOT.not_applicable}`} />
        N/A
      </span>
      <span className="text-[11px] italic text-muted-foreground">pre-enrolment</span>
    </div>
  );
}
