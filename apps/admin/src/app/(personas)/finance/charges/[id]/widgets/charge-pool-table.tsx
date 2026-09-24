'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownRight, ArrowUpRight, FileText } from 'lucide-react';

import {
  Badge,
  Button,
  DataTable,
  Input,
  Private,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type MassActions,
} from '@shesa/ui';

import { ExportButton } from '@/components/export-button';
import { PaymentStateChip, settlementOf } from '@/components/finance/payment-state-chip';
import { formatShortDay, formatTime24 } from '@/lib/format/date-time';

import { markReconciled, undoReconciliation } from '../../../transactions/transaction-actions';
import { buildChargePoolExport } from './charge-detail-export';
import { ChargePoolPaymentSheet } from './charge-pool-payment-sheet';
import type { ChargeDetailPoolProps, PoolRow } from './charge-detail-types';
import { downloadCsv, formatMethod, getInitials, slugify } from './shared-formatters';

/**
 * Flat payments table for pool-shape charges. Column layout matches
 * the mainstream Transactions view: Date (day + time on two lines),
 * Payer, Amount, Method, Status, Reconciled. Rows are selectable so
 * operators can bulk-reconcile from the mass-actions bar.
 *
 * The Reconciled column shows a "Pending" chip instead of a dash so
 * the operator can tell at a glance which payments still need work.
 */
export function ChargePoolTable({ summary, poolPayments }: ChargeDetailPoolProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [gridApi, setGridApi] = useState<GridApi<PoolRow> | null>(null);
  const [detail, setDetail] = useState<PoolRow | null>(null);
  const [isPending, startTransition] = useTransition();

  // Search reaches the size and the contact details too, now that they
  // are on the table — an operator looking for "XL" or chasing a phone
  // number should not have to eyeball the column.
  const filtered = useMemo<readonly PoolRow[]>(() => {
    const q = search.trim().toLowerCase();
    return poolPayments
      .filter((p) =>
        q
          ? p.payerLabel.toLowerCase().includes(q) ||
            (p.attireSize ?? '').toLowerCase() === q ||
            (p.payerEmail ?? '').toLowerCase().includes(q) ||
            (p.payerPhone ?? '').toLowerCase().includes(q)
          : true,
      )
      .map((p, i) => ({ ...p, serial: i + 1 }));
  }, [poolPayments, search]);

  const hasSizes = useMemo(() => poolPayments.some((p) => !!p.attireSize), [poolPayments]);
  const hasContacts = useMemo(
    () => poolPayments.some((p) => !!p.payerEmail || !!p.payerPhone),
    [poolPayments],
  );

  const runReconcile = (ids: readonly string[], onDone: () => void) => {
    if (ids.length === 0) return;
    startTransition(async () => {
      const result = await markReconciled(ids, null, null);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(
        result.data && result.data.count > 0
          ? `${result.data.count} payment(s) reconciled.`
          : 'Nothing new to reconcile.',
      );
      onDone();
      router.refresh();
    });
  };

  const runUndo = (ids: readonly string[], onDone: () => void) => {
    if (ids.length === 0) return;
    startTransition(async () => {
      const result = await undoReconciliation(ids);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(
        result.data && result.data.count > 0
          ? `${result.data.count} reconciliation(s) undone.`
          : 'Nothing to undo.',
      );
      onDone();
      router.refresh();
    });
  };

  const columnDefs = useMemo<ColDef<PoolRow>[]>(
    // No manual checkbox column — `selectable` adds the pinned one.
    () => [
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
        cellRenderer: (p: ICellRendererParams<PoolRow, string>) => {
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
        minWidth: 220,
        cellRenderer: (p: ICellRendererParams<PoolRow>) =>
          p.data ? (
            <div className="flex h-full min-w-0 items-center gap-2.5 py-1">
              <Private>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {getInitials(p.data.payerLabel)}
                </span>
              </Private>
              <Private className="min-w-0 flex-1">
                <span
                  className="block truncate text-sm font-medium text-foreground"
                  title={p.data.payerLabel}
                >
                  {p.data.payerLabel}
                </span>
              </Private>
            </div>
          ) : null,
      },
      // Size and contact only appear when the data has them. A blank
      // "Size" column on a ticket charge, or an empty "Contact" on a
      // charge paid entirely by signed-in members, is a column the
      // operator has to scan past on every row for nothing.
      ...(hasSizes
        ? [
            {
              headerName: 'Size',
              field: 'attireSize' as const,
              width: 90,
              cellRenderer: (p: ICellRendererParams<PoolRow>) =>
                p.data?.attireSize ? (
                  <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                    {p.data.attireSize}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                ),
            },
          ]
        : []),
      ...(hasContacts
        ? [
            {
              headerName: 'Contact',
              colId: 'contact',
              flex: 1.2,
              minWidth: 230,
              autoHeight: true,
              sortable: false,
              cellRenderer: (p: ICellRendererParams<PoolRow>) => {
                if (!p.data) return null;
                const { payerEmail, payerPhone } = p.data;
                if (!payerEmail && !payerPhone) {
                  return <span className="text-xs text-muted-foreground">—</span>;
                }
                return (
                  <Private as="block">
                    <div className="flex min-w-0 flex-col justify-center py-1 leading-tight">
                      {payerEmail && (
                        <a
                          href={`mailto:${payerEmail}`}
                          title={payerEmail}
                          className="truncate text-[12.5px] text-foreground hover:text-primary"
                        >
                          {payerEmail}
                        </a>
                      )}
                      {payerPhone && (
                        <a
                          href={`tel:${payerPhone.replace(/\s+/g, '')}`}
                          className="truncate text-[11px] tabular-nums text-muted-foreground hover:text-primary"
                        >
                          {payerPhone}
                        </a>
                      )}
                    </div>
                  </Private>
                );
              },
            },
          ]
        : []),
      {
        headerName: 'Amount',
        field: 'amount',
        width: 160,
        cellRenderer: (p: ICellRendererParams<PoolRow>) => {
          if (!p.data) return null;
          const isReversal = p.data.isReversal;
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
              {new Intl.NumberFormat().format(Math.round(p.data.amount))} {p.data.currency}
            </span>
          );
        },
      },
      {
        headerName: 'Method',
        field: 'method',
        width: 160,
        autoHeight: true,
        cellRenderer: (p: ICellRendererParams<PoolRow>) => {
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
      // Settlement and reconciliation in one chip, the same way the
      // mainstream Transactions table draws them — see
      // `PaymentStateChip` for why they stay two facts in one pill.
      {
        headerName: 'State',
        field: 'reconciled',
        width: 150,
        cellRenderer: (p: ICellRendererParams<PoolRow>) => {
          if (!p.data) return null;
          return (
            <PaymentStateChip
              settlement={settlementOf(p.data.isReversal, !!p.data.isReversedOriginal)}
              reconciled={!!p.data.reconciled}
              reconciledAt={p.data.reconciledAt}
            />
          );
        },
      },
    ],
    [],
  );

  const massActions = useMemo<MassActions<PoolRow>>(
    () => ({
      itemName: 'payment',
      pluralItemName: 'payments',
      custom: [
        {
          label: 'Mark reconciled',
          onClick: (selected) => {
            const ids = selected.filter((r) => !r.reconciled).map((r) => r.id);
            if (ids.length === 0) {
              toast.info('Every selected payment is already reconciled.');
              return;
            }
            runReconcile(ids, () => gridApi?.deselectAll());
          },
        },
        {
          label: 'Undo reconciliation',
          onClick: (selected) => {
            const ids = selected.filter((r) => r.reconciled).map((r) => r.id);
            if (ids.length === 0) {
              toast.info('None of the selected payments is reconciled.');
              return;
            }
            runUndo(ids, () => gridApi?.deselectAll());
          },
        },
      ],
    }),
    [gridApi],
  );

  const exportCsv = () => {
    const header = [
      'Date',
      'Payer',
      'Email',
      'Phone',
      'Size',
      'Amount',
      'Currency',
      'Method',
      'Source',
      'Status',
      'Reconciled',
    ];
    const rows: string[][] = poolPayments.map((p) => [
      p.createdAt,
      p.payerLabel,
      p.payerEmail ?? '',
      p.payerPhone ?? '',
      p.attireSize ?? '',
      p.amount.toFixed(2),
      p.currency,
      formatMethod(p.method),
      p.source === 'auto' ? 'Website' : 'Manual',
      p.isReversal ? 'Reversal' : p.isReversedOriginal ? 'Reversed' : 'Cleared',
      p.reconciled ? 'Yes' : 'No',
    ]);
    downloadCsv(`${slugify(summary.name)}-payments`, [header, ...rows]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          type="search"
          placeholder="Search payers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64"
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {poolPayments.length}{' '}
            {poolPayments.length === 1 ? 'payment' : 'payments'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={exportCsv}
            className="gap-1.5 text-muted-foreground"
          >
            <FileText className="h-3.5 w-3.5" />
            CSV
          </Button>
          <ExportButton
            spec={() => buildChargePoolExport(summary, filtered, formatMethod)}
            disabled={filtered.length === 0}
          />
        </div>
      </div>
      <DataTable<PoolRow>
        rowData={filtered as PoolRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={(e) => e.data && setDetail(e.data)}
        showColumnPicker={false}
        selectable
        massActions={massActions}
      />

      <ChargePoolPaymentSheet
        open={detail !== null}
        onClose={() => setDetail(null)}
        summary={summary}
        payment={detail}
        pending={isPending}
        onReconcile={(id) => runReconcile([id], () => setDetail(null))}
        onUndo={(id) => runUndo([id], () => setDetail(null))}
      />
    </div>
  );
}
