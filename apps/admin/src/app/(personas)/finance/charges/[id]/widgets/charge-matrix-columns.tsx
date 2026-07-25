import type { ColDef, ICellRendererParams } from '@shesa/ui';

import type { MatrixPeriod, MatrixRow } from './charge-detail-types';
import {
  ChargeMatrixCellChip,
  ChargeMatrixNotApplicableChip,
  ChargeMatrixUpcomingChip,
} from './charge-matrix-cell-chip';
import { ChargeMatrixCoverageBar } from './charge-matrix-coverage-bar';
import { ChargeMatrixMemberCell } from './charge-matrix-member-cell';
import { formatMoney, formatPeriodHeader } from './shared-formatters';

/**
 * Column defs for the member × period matrix. Two pinned columns
 * (Member, Coverage) frame a scrolling middle strip of period columns
 * plus two pinned right-side rollups (Paid, Outstanding). The
 * "current" period gets a header suffix + a tinted body cell so the
 * eye lands on it without the operator having to scroll.
 */
export function buildChargeMatrixColumnDefs({
  periods,
  currency,
  currentPeriodKey,
}: {
  readonly periods: readonly MatrixPeriod[];
  readonly currency: string;
  readonly currentPeriodKey: string | null;
}): ColDef<MatrixRow>[] {
  const cols: ColDef<MatrixRow>[] = [
    {
      headerName: '#',
      field: 'serial',
      width: 56,
      maxWidth: 56,
      sortable: false,
      filter: false,
      pinned: 'left',
      cellClass: 'text-xs text-muted-foreground',
    },
    {
      headerName: 'Member',
      field: 'fullName',
      pinned: 'left',
      minWidth: 350,
      flex: 1.5,
      cellRenderer: (p: ICellRendererParams<MatrixRow>) =>
        p.data ? <ChargeMatrixMemberCell member={p.data} currency={currency} /> : null,
    },
    {
      headerName: 'Coverage',
      colId: 'coverage',
      width: 150,
      pinned: 'left',
      valueGetter: (p) => (p.data as MatrixRow | undefined)?._coverage ?? 0,
      cellRenderer: (p: ICellRendererParams<MatrixRow>) =>
        p.data ? (
          <ChargeMatrixCoverageBar percent={Math.round((p.data._coverage ?? 0) * 100)} />
        ) : null,
    },
  ];

  periods.forEach((period, colIdx) => {
    const isCurrent = period.key === currentPeriodKey;
    cols.push({
      headerName: formatPeriodHeader(period) + (isCurrent ? ' · today' : ''),
      colId: `period_${period.key}`,
      // Current period gets extra room so "MMM YYYY · today" plus the
      // AG-Grid header menu chevron never clip on a laptop viewport.
      width: isCurrent ? 210 : 150,
      sortable: false,
      filter: false,
      headerClass: period.isUpcoming
        ? 'ag-header-upcoming'
        : isCurrent
          ? 'ag-header-current'
          : undefined,
      cellClass: period.isUpcoming
        ? '!bg-muted/20'
        : isCurrent
          ? '!bg-primary/5 cursor-pointer'
          : 'cursor-pointer',
      cellRenderer: (p: ICellRendererParams<MatrixRow>) => {
        if (!p.data) return null;
        if (period.isUpcoming) return <ChargeMatrixUpcomingChip />;
        const cell = p.data.cells[colIdx];
        if (!cell) {
          // No obligation for this member × period. If the member
          // wasn't yet enrolled during this period, render an
          // accounting-friendly "N/A" instead of an ambiguous dash.
          const joinedAt = p.data.joinedAt;
          const periodEnd = period.periodEnd;
          if (joinedAt && periodEnd) {
            const j = new Date(joinedAt).getTime();
            const e = new Date(periodEnd).getTime();
            if (Number.isFinite(j) && Number.isFinite(e) && e <= j) {
              return <ChargeMatrixNotApplicableChip />;
            }
          }
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        return <ChargeMatrixCellChip cell={cell} />;
      },
    });
  });

  cols.push(
    {
      headerName: 'Paid',
      colId: 'paid',
      flex: 1,
      minWidth: 150,
      valueGetter: (p) => (p.data as MatrixRow | undefined)?._totalPaid ?? 0,
      cellRenderer: (p: ICellRendererParams<MatrixRow>) =>
        p.data ? (
          <span className="text-sm font-medium text-foreground tabular-nums">
            {formatMoney(p.data._totalPaid ?? 0, currency)}
          </span>
        ) : null,
    },
    {
      headerName: 'Outstanding',
      colId: 'outstanding',
      flex: 1,
      minWidth: 200,
      sort: 'desc',
      valueGetter: (p) => (p.data as MatrixRow | undefined)?._outstanding ?? 0,
      cellRenderer: (p: ICellRendererParams<MatrixRow>) => {
        if (!p.data) return null;
        const out = p.data._outstanding ?? 0;
        return (
          <span
            className={`text-sm font-medium tabular-nums ${
              out > 0.0001 ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {out > 0.0001 ? formatMoney(out, currency) : '—'}
          </span>
        );
      },
    },
  );
  return cols;
}
