import { ArrowDownRight, ArrowUpRight, BadgeCheck } from 'lucide-react';

import { Badge, type ColDef, type ICellRendererParams } from '@shesa/ui';

import { formatShortDay, formatTime24 } from '@/lib/format/date-time';

import { ChargeCell } from './charge-cell';
import { PayerCell } from './payer-cell';
import { TransactionRowActions } from './transaction-row-actions';
import { TransactionStatusBadge } from './transaction-status-badge';
import type { TransactionRow, SerialRow } from './transactions-types';
import { formatMethod } from './transactions-helpers';

interface TransactionColumnActions {
  readonly reversedIds: ReadonlySet<string>;
  readonly pending: boolean;
  readonly onPreviewReceipt: (row: TransactionRow) => void;
  readonly onCopyVerifyUrl: (row: TransactionRow) => void;
  readonly onReverse: (row: TransactionRow) => void;
  readonly onReconcile: (row: TransactionRow) => void;
  readonly onUndoReconciliation: (row: TransactionRow) => void;
}

/**
 * Column defs for the payments DataTable. Columns are S/N · When ·
 * Payer · For · Amount · Method · Source · Status · overflow.
 * Overflow menu shows receipt + reverse based on the row's shape.
 * Row-action state (which rows are already reversed) comes from a
 * pre-computed set in `payments-helpers` so the columns can render
 * O(1) without walking the payments list per cell.
 */
export function buildTransactionColumns(actions: TransactionColumnActions): ColDef<SerialRow>[] {
  const {
    reversedIds,
    pending,
    onPreviewReceipt,
    onCopyVerifyUrl,
    onReverse,
    onReconcile,
    onUndoReconciliation,
  } = actions;
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
      headerName: 'Date',
      field: 'createdAt',
      width: 180,
      autoHeight: true,
      cellRenderer: (p: ICellRendererParams<SerialRow, string>) => {
        if (!p.value) return <span className="text-xs text-muted-foreground">-</span>;
        return (
          <div className="flex flex-col justify-center py-1 leading-tight">
            <span className="text-sm text-foreground">{formatShortDay(p.value)}</span>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {formatTime24(p.value)}
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'Payer',
      field: 'payerLabel',
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (p: ICellRendererParams<SerialRow, string>) =>
        p.data ? <PayerCell label={p.data.payerLabel} /> : null,
    },
    {
      headerName: 'Reason',
      field: 'chargeName',
      flex: 1.6,
      minWidth: 220,
      cellRenderer: (p: ICellRendererParams<SerialRow, string>) =>
        p.data ? (
          <ChargeCell
            chargeName={p.data.chargeName}
            chargeShape={p.data.chargeShape}
            scopeName={p.data.scopeName}
          />
        ) : null,
    },
    {
      headerName: 'Amount',
      field: 'amount',
      width: 150,
      cellRenderer: (p: ICellRendererParams<SerialRow, number>) => {
        if (!p.data) return null;
        const isReversal = !!p.data.reversesPaymentId;
        return (
          <span
            className={`inline-flex items-center gap-1 text-sm ${
              isReversal ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
            }`}
          >
            {isReversal ? (
              <ArrowDownRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpRight className="h-3.5 w-3.5" />
            )}
            {new Intl.NumberFormat().format(p.data.amount)} {p.data.currency}
          </span>
        );
      },
    },
    {
      headerName: 'Method',
      field: 'method',
      width: 160,
      autoHeight: true,
      cellRenderer: (p: ICellRendererParams<SerialRow>) => {
        if (!p.data) return null;
        const sourceLabel = p.data.source === 'auto' ? 'Website' : 'Manual';
        return (
          <div className="flex flex-col justify-center py-1 leading-tight">
            <span className="text-sm text-foreground">{formatMethod(p.data.method)}</span>
            <span className="text-[11px] text-muted-foreground">({sourceLabel})</span>
          </div>
        );
      },
    },
    {
      headerName: 'Status',
      field: 'reversesPaymentId',
      width: 140,
      cellRenderer: (p: ICellRendererParams<SerialRow>) => {
        if (!p.data) return null;
        return (
          <TransactionStatusBadge
            isReversal={!!p.data.reversesPaymentId}
            isReversedOriginal={reversedIds.has(p.data.id)}
          />
        );
      },
    },
    {
      headerName: 'Reconciled',
      field: 'reconciled',
      width: 130,
      cellRenderer: (p: ICellRendererParams<SerialRow>) => {
        if (!p.data) return null;
        return p.data.reconciled ? (
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          >
            <BadgeCheck className="h-3 w-3" />
            Reconciled
          </Badge>
        ) : (
          <Badge variant="outline" className="border-border text-muted-foreground">
            —
          </Badge>
        );
      },
    },
    {
      headerName: '',
      colId: 'row_actions',
      width: 64,
      maxWidth: 64,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellRenderer: (p: ICellRendererParams<SerialRow>) => {
        if (!p.data) return null;
        const row = p.data;
        const isReversal = !!row.reversesPaymentId;
        const alreadyReversed = reversedIds.has(row.id);
        return (
          <TransactionRowActions
            row={row}
            canReverse={!isReversal && !alreadyReversed}
            hasReceipt={!!row.receiptToken}
            pending={pending}
            onPreviewReceipt={onPreviewReceipt}
            onCopyVerifyUrl={onCopyVerifyUrl}
            onReverse={onReverse}
            onReconcile={onReconcile}
            onUndoReconciliation={onUndoReconciliation}
          />
        );
      },
    },
  ];
}
