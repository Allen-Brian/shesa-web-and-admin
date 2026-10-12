import { Badge, type ColDef, type ICellRendererParams } from '@shesa/ui';

import { ExpensePayeeCell } from './expense-payee-cell';
import { ExpenseRowActions } from './expense-row-actions';
import { ExpenseStatusBadge } from './expense-status-badge';
import type { ExpenseRow, SerialRow } from './expenses-types';

interface ExpenseColumnActions {
  readonly pending: boolean;
  readonly onApprove: (id: string) => void;
  readonly onReverse: (row: ExpenseRow) => void;
}

/**
 * Column defs for the expenses DataTable — S/N · Incurred · Payee ·
 * Category · Amount · Status · Actions. Amount is signed (− for
 * originals, + for reversals) so the ledger polarity is instantly
 * visible; Status collapses reversal/reversed/original into one pill.
 */
export function buildExpenseColumns(actions: ExpenseColumnActions): ColDef<SerialRow>[] {
  return [
    {
      headerName: 'S/N',
      field: 'serial',
      width: 72,
      maxWidth: 72,
      sortable: false,
      filter: false,
      suppressMovable: true,
    },
    {
      headerName: 'Incurred',
      field: 'incurredAt',
      width: 130,
      valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
    },
    {
      headerName: 'Payee',
      field: 'payee',
      flex: 2,
      minWidth: 240,
      cellRenderer: (p: ICellRendererParams<SerialRow, string>) =>
        p.data ? <ExpensePayeeCell row={p.data} /> : null,
    },
    {
      headerName: 'Category',
      field: 'categoryName',
      width: 150,
      cellRenderer: (p: ICellRendererParams<SerialRow, string | null>) =>
        p.value ? (
          <Badge variant="outline" className="border-border/60 text-foreground">
            {p.value}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      headerName: 'Amount',
      field: 'amount',
      width: 150,
      cellRenderer: (p: ICellRendererParams<SerialRow, number>) => {
        if (!p.data) return null;
        const isReversalRow = !!p.data.reversesExpenseId;
        return (
          <span
            className={`text-sm ${
              isReversalRow ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
            }`}
          >
            {isReversalRow ? '+' : '−'}
            {new Intl.NumberFormat().format(p.data.amount)} {p.data.currency}
          </span>
        );
      },
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 160,
      cellRenderer: (p: ICellRendererParams<SerialRow, string>) => {
        if (!p.data) return null;
        if (p.data.reversesExpenseId) {
          return (
            <Badge
              variant="outline"
              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            >
              Reversal
            </Badge>
          );
        }
        if (p.data.isReversed) {
          return (
            <Badge
              variant="outline"
              className="border-destructive/40 bg-destructive/10 text-destructive"
            >
              Reversed
            </Badge>
          );
        }
        return <ExpenseStatusBadge status={p.value ?? ''} />;
      },
    },
    {
      headerName: 'Actions',
      colId: 'row_actions',
      width: 160,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellRenderer: (p: ICellRendererParams<SerialRow>) =>
        p.data ? (
          <ExpenseRowActions
            row={p.data}
            pending={actions.pending}
            onApprove={actions.onApprove}
            onReverse={actions.onReverse}
          />
        ) : null,
    },
  ];
}
