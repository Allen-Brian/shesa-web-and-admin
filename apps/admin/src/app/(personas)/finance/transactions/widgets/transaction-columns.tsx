import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { type ColDef, type ICellRendererParams } from '@shesa/ui';

import { PaymentStateChip, settlementOf } from '@/components/finance/payment-state-chip';
import { formatShortDay, formatTime24 } from '@/lib/format/date-time';

import { ChargeCell } from './charge-cell';
import { PayerCell } from './payer-cell';
import { TransactionRowActions } from './transaction-row-actions';
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
 * Column defs for the payments DataTable. Columns are S/N · Date ·
 * Time · Payer · Reason · Amount · Method · State · Actions.
 *
 * Settlement and reconciliation share the one State column: they are
 * two facts about the same payment, and `PaymentStateChip` draws both
 * in a single pill so the table does not spend two columns — one of
 * them mostly em dashes — saying what one chip says. See that
 * component for why they are not collapsed into a single word.
 *
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
      // Date and time are separate columns so each sorts and filters on its
      // own — "everything on the 14th" and "everything after 18:00" are
      // different questions, and a single stacked cell answers neither.
      headerName: 'Date',
      field: 'createdAt',
      width: 130,
      cellRenderer: (p: ICellRendererParams<SerialRow, string>) => {
        if (!p.value) return <span className="text-xs text-muted-foreground">-</span>;
        return <span className="text-sm text-foreground">{formatShortDay(p.value)}</span>;
      },
    },
    {
      headerName: 'Time',
      field: 'createdAt',
      colId: 'createdAtTime',
      width: 100,
      valueFormatter: (p) => formatTime24(p.value as string) ?? '-',
      cellClass: 'tabular-nums text-muted-foreground',
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
      // Sorts on the reconciliation flag rather than on the settlement
      // word: "what still needs matching" is the question an operator
      // actually sorts this column to answer.
      headerName: 'State',
      field: 'reconciled',
      width: 150,
      cellRenderer: (p: ICellRendererParams<SerialRow>) => {
        if (!p.data) return null;
        return (
          <PaymentStateChip
            settlement={settlementOf(!!p.data.reversesPaymentId, reversedIds.has(p.data.id))}
            reconciled={p.data.reconciled}
            reconciledAt={p.data.reconciledAt}
          />
        );
      },
    },
    {
      headerName: 'Actions',
      colId: 'row_actions',
      width: 90,
      maxWidth: 90,
      sortable: false,
      filter: false,
      suppressMovable: true,
      headerClass: 'text-center',
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
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
