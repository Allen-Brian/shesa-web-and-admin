import { CELL_DOT, type CellStateKey } from './shared-cell-state';

/**
 * Colour legend for the matrix cell states — rendered as a tiny row of
 * dot + label pairs just above the DataTable. `cancelled` is
 * intentionally omitted from the visible legend to keep the strip
 * short; it's uncommon in practice and the tooltip on the actual chip
 * carries the label when it appears.
 */
export function ChargeMatrixLegend() {
  const items: readonly { state: CellStateKey; label: string }[] = [
    { state: 'paid', label: 'Paid' },
    { state: 'partial', label: 'Partial' },
    { state: 'open', label: 'Current' },
    { state: 'overdue', label: 'In arrears' },
    { state: 'waived', label: 'Waived' },
    { state: 'upcoming', label: 'Upcoming' },
    { state: 'not_applicable', label: 'N/A (pre-enrolment)' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.state} className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${CELL_DOT[i.state]}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
