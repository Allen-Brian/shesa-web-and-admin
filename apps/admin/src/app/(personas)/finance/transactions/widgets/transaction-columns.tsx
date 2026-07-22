import { ArrowDownRight, ArrowUpRight, BadgeCheck } from 'lucide-react';

import { Badge, type ColDef, type ICellRendererParams } from '@shesa/ui';

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
      headerName: 'When',
      field: 'createdAt',
      width: 170,
      valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString() : '—'),
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
      headerName: 'For',
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
      width: 130,
      valueFormatter: (p) => formatMethod(p.value ?? ''),
    },
    {
      headerName: 'Source',
      field: 'source',
      width: 100,
      cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
        <Badge
          variant="outline"
          className={
            p.value === 'auto'
              ? 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300'
              : 'border-border text-foreground'
          }
        >
          {p.value === 'auto' ? 'Auto' : 'Manual'}
        </Badge>
      ),
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
