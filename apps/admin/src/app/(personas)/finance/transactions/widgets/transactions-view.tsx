'use client';

import { useMemo, useState } from 'react';
import { TextAlignJustify } from 'lucide-react';

import { DataTable, EntityTablePanel, toast, type GridApi, type MassActions } from '@shesa/ui';

import { ExportButton } from '@/components/export-button';
import { activeFilters, windowLabel } from '@/lib/export/filters';

import { buildTransactionsExport } from './transactions-export';
import { ReconcileTransactionDialog } from './reconcile-transaction-dialog';
import { ReceiptPreviewDialog } from './receipt-preview-dialog';
import { RecordTransactionDialog } from './record-transaction-dialog';
import { ReverseTransactionDialog } from './reverse-transaction-dialog';
import { TransactionDetailSheet } from './transaction-detail-sheet';
import { buildTransactionColumns } from './transaction-columns';
import { TransactionsKpiStrip } from './transactions-kpi-strip';
import { TransactionsTableFilters } from './transactions-table-filters';
import { buildPaymentKpis } from './transactions-kpis';
import {
  buildVerifyUrl,
  collectReversedIds,
  formatMethod,
  initialRecord,
} from './transactions-helpers';
import type {
  ChargeOption,
  MethodFilter,
  ReconciliationFilter,
  RecordForm,
  SerialRow,
  SourceFilter,
  TransactionRow,
} from './transactions-types';
import { useTransactionsActions } from './use-transactions-actions';

interface TransactionsViewProps {
  readonly transactions: readonly TransactionRow[];
  readonly chargeOptions: readonly ChargeOption[];
  readonly baseUrl: string;
}

/**
 * Transactions view — KPI strip + filter-aware DataTable + row-click
 * detail sheet + dialogs (record / reverse / receipt preview /
 * reconcile). Mass-selectable rows drive the reconcile / undo bulk
 * actions. Every sibling widget is presentational; this file wires
 * the state that binds them.
 */
export function TransactionsView({ transactions, chargeOptions, baseUrl }: TransactionsViewProps) {
  const actions = useTransactionsActions({ chargeOptions });
  const { pending } = actions;

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [reconciliationFilter, setReconciliationFilter] = useState<ReconciliationFilter>('all');
  const [reasonFilter, setReasonFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);

  const [recordOpen, setRecordOpen] = useState(false);
  const [recordForm, setRecordForm] = useState<RecordForm>(() => initialRecord(chargeOptions));
  const [reversing, setReversing] = useState<TransactionRow | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [previewing, setPreviewing] = useState<TransactionRow | null>(null);
  const [reconciling, setReconciling] = useState<TransactionRow | null>(null);
  const [detail, setDetail] = useState<TransactionRow | null>(null);

  const kpis = useMemo(() => buildPaymentKpis(transactions), [transactions]);
  const reversedIds = useMemo(() => collectReversedIds(transactions), [transactions]);
  const reasonOptions = useMemo(() => {
    const names = new Set<string>();
    for (const t of transactions) {
      if (t.chargeName && t.chargeName !== '—') names.add(t.chargeName);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const filtered = useMemo<readonly SerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    // Date range works on `createdAt` — inclusive on both ends. Empty
    // string means "unbounded on that side".
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    return transactions
      .filter((p) => {
        if (sourceFilter !== 'all' && p.source !== sourceFilter) return false;
        if (methodFilter !== 'all' && p.method !== methodFilter) return false;
        if (reconciliationFilter === 'reconciled' && !p.reconciled) return false;
        if (reconciliationFilter === 'unreconciled' && p.reconciled) return false;
        if (reasonFilter && p.chargeName !== reasonFilter) return false;
        if (fromMs !== null || toMs !== null) {
          const ts = new Date(p.createdAt).getTime();
          if (fromMs !== null && ts < fromMs) return false;
          if (toMs !== null && ts > toMs) return false;
        }
        if (!q) return true;
        if (p.payerLabel.toLowerCase().includes(q)) return true;
        if (p.chargeName.toLowerCase().includes(q)) return true;
        if (p.scopeName.toLowerCase().includes(q)) return true;
        if (p.method.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((p, i) => ({ ...p, serial: i + 1 }));
  }, [
    transactions,
    search,
    sourceFilter,
    methodFilter,
    reconciliationFilter,
    reasonFilter,
    dateFrom,
    dateTo,
  ]);

  const exportMeta = useMemo(
    () =>
      activeFilters({
        Search: search.trim(),
        Method: methodFilter === 'all' ? null : formatMethod(methodFilter),
        Source: sourceFilter === 'all' ? null : sourceFilter === 'auto' ? 'Website' : 'Manual',
        Reconciliation: reconciliationFilter,
        'Paid for': reasonFilter,
        Window: windowLabel(dateFrom, dateTo),
      }),
    [search, methodFilter, sourceFilter, reconciliationFilter, reasonFilter, dateFrom, dateTo],
  );

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Verify URL copied.');
    } catch {
      toast.error('Could not copy — copy manually from the receipt.');
    }
  };

  const undoOne = (row: TransactionRow) => actions.runUndoReconciliation([row.id], () => {});

  const columnDefs = useMemo(
    () =>
      buildTransactionColumns({
        reversedIds,
        pending,
        onPreviewReceipt: setPreviewing,
        onCopyVerifyUrl: (row) =>
          row.receiptToken && copyUrl(buildVerifyUrl(baseUrl, row.receiptToken)),
        onReverse: setReversing,
        onReconcile: setReconciling,
        onUndoReconciliation: undoOne,
      }),
    [reversedIds, pending, baseUrl],
  );

  const openRecord = () => {
    setRecordForm(initialRecord(chargeOptions));
    setRecordOpen(true);
  };

  const closeReverse = () => {
    setReversing(null);
    setReverseReason('');
  };

  const previewVerifyUrl = previewing?.receiptToken
    ? buildVerifyUrl(baseUrl, previewing.receiptToken)
    : '';
  const detailVerifyUrl = detail?.receiptToken ? buildVerifyUrl(baseUrl, detail.receiptToken) : '';

  const massActions = useMemo<MassActions<SerialRow>>(
    () => ({
      itemName: 'transaction',
      pluralItemName: 'transactions',
      custom: [
        {
          label: 'Mark reconciled',
          onClick: (selected) => {
            const ids = selected.filter((r) => !r.reconciled).map((r) => r.id);
            if (ids.length === 0) {
              toast.info('Every selected transaction is already reconciled.');
              return;
            }
            actions.runReconcile(ids, null, null, () => gridApi?.deselectAll());
          },
        },
        {
          label: 'Undo reconciliation',
          onClick: (selected) => {
            const ids = selected.filter((r) => r.reconciled).map((r) => r.id);
            if (ids.length === 0) {
              toast.info('None of the selected transactions is reconciled.');
              return;
            }
            actions.runUndoReconciliation(ids, () => gridApi?.deselectAll());
          },
        },
      ],
    }),
    [actions, gridApi],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <TextAlignJustify className="h-6 w-6" />
          Transactions
        </h1>
        <p className="text-sm text-muted-foreground">
          Every payment across scopes you can see. Click a row for the full detail sheet. Reconcile
          from the row menu or bulk-reconcile with the selection bar.
        </p>
      </div>

      <TransactionsKpiStrip kpis={kpis} />

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'transaction' : 'transactions'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={chargeOptions.length > 0}
        createLabel="Record transaction"
        onCreate={openRecord}
        actions={
          <ExportButton
            spec={() => buildTransactionsExport(filtered, reversedIds, exportMeta)}
            disabled={filtered.length === 0}
          />
        }
        filters={
          <TransactionsTableFilters
            methodFilter={methodFilter}
            onMethodChange={setMethodFilter}
            sourceFilter={sourceFilter}
            onSourceChange={setSourceFilter}
            reconciliationFilter={reconciliationFilter}
            onReconciliationChange={setReconciliationFilter}
            reasonFilter={reasonFilter}
            onReasonChange={setReasonFilter}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateRangeChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
            reasonOptions={reasonOptions}
          />
        }
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable
        massActions={massActions}
        onRowClicked={(e) => e.data && setDetail(e.data)}
      />

      <RecordTransactionDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        form={recordForm}
        onFormChange={(patch) => setRecordForm((f) => ({ ...f, ...patch }))}
        chargeOptions={chargeOptions}
        onSubmit={() => actions.runRecord(recordForm, () => setRecordOpen(false))}
        pending={pending}
      />
      <ReverseTransactionDialog
        target={reversing}
        onClose={closeReverse}
        reason={reverseReason}
        onReasonChange={setReverseReason}
        onSubmit={() => {
          if (!reversing) return;
          actions.runReverse(reversing.id, reverseReason, closeReverse);
        }}
        pending={pending}
      />
      <ReceiptPreviewDialog
        target={previewing}
        verifyUrl={previewVerifyUrl}
        onClose={() => setPreviewing(null)}
        onCopyUrl={() => previewVerifyUrl && copyUrl(previewVerifyUrl)}
      />
      <ReconcileTransactionDialog
        target={reconciling}
        pending={pending}
        onClose={() => setReconciling(null)}
        onSubmit={(matchedRef, notes) => {
          if (!reconciling) return;
          actions.runReconcile([reconciling.id], matchedRef, notes, () => setReconciling(null));
        }}
      />
      <TransactionDetailSheet
        target={detail}
        verifyUrl={detailVerifyUrl}
        canReverse={!!detail && !detail.reversesPaymentId && !reversedIds.has(detail.id)}
        alreadyReversed={!!detail && reversedIds.has(detail.id)}
        onClose={() => setDetail(null)}
        onPreviewReceipt={(row) => setPreviewing(row)}
        onReverse={(row) => setReversing(row)}
        onReconcile={(row) => setReconciling(row)}
        onUndoReconciliation={(row) => undoOne(row)}
      />
    </div>
  );
}
