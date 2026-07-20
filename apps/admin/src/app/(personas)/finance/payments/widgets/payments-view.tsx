'use client';

import { useMemo, useState } from 'react';
import { LandPlot } from 'lucide-react';

import { DataTable, EntityTablePanel, toast, type GridApi } from '@shesa/ui';

import { buildPaymentColumns } from './payment-columns';
import { PaymentsKpiStrip } from './payments-kpi-strip';
import { PaymentsTableFilters } from './payments-table-filters';
import { buildPaymentKpis } from './payments-kpis';
import { buildVerifyUrl, collectReversedIds, initialRecord } from './payments-helpers';
import type {
  ChargeOption,
  MethodFilter,
  PaymentRow,
  RecordForm,
  SerialRow,
  SourceFilter,
} from './payments-types';
import { RecordPaymentDialog } from './record-payment-dialog';
import { ReceiptPreviewDialog } from './receipt-preview-dialog';
import { ReversePaymentDialog } from './reverse-payment-dialog';
import { usePaymentsActions } from './use-payments-actions';

interface PaymentsViewProps {
  readonly payments: readonly PaymentRow[];
  readonly chargeOptions: readonly ChargeOption[];
  readonly baseUrl: string;
}

/**
 * Payments view — KPI strip + filter-aware DataTable + three dialogs
 * (record / reverse / receipt preview). Every rendered chunk delegates
 * to a sibling widget; this file wires the state that binds them.
 */
export function PaymentsView({ payments, chargeOptions, baseUrl }: PaymentsViewProps) {
  const actions = usePaymentsActions({ chargeOptions });
  const { pending } = actions;

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);

  const [recordOpen, setRecordOpen] = useState(false);
  const [recordForm, setRecordForm] = useState<RecordForm>(() => initialRecord(chargeOptions));
  const [reversing, setReversing] = useState<PaymentRow | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [previewing, setPreviewing] = useState<PaymentRow | null>(null);

  const kpis = useMemo(() => buildPaymentKpis(payments), [payments]);
  const reversedIds = useMemo(() => collectReversedIds(payments), [payments]);

  const filtered = useMemo<readonly SerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return payments
      .filter((p) => {
        if (sourceFilter !== 'all' && p.source !== sourceFilter) return false;
        if (methodFilter !== 'all' && p.method !== methodFilter) return false;
        if (!q) return true;
        if (p.payerLabel.toLowerCase().includes(q)) return true;
        if (p.chargeName.toLowerCase().includes(q)) return true;
        if (p.scopeName.toLowerCase().includes(q)) return true;
        if (p.method.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((p, i) => ({ ...p, serial: i + 1 }));
  }, [payments, search, sourceFilter, methodFilter]);

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Verify URL copied.');
    } catch {
      toast.error('Could not copy — copy manually from the receipt.');
    }
  };

  const columnDefs = useMemo(
    () =>
      buildPaymentColumns({
        reversedIds,
        pending,
        onPreviewReceipt: setPreviewing,
        onCopyVerifyUrl: (row) =>
          row.receiptToken && copyUrl(buildVerifyUrl(baseUrl, row.receiptToken)),
        onReverse: setReversing,
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <LandPlot className="h-6 w-6" />
          Payments
        </h1>
        <p className="text-sm text-muted-foreground">
          Every payment across scopes you can see. Manual entries (cash / bank) and
          gateway-confirmed payments (auto) share this table. Reversals are new immutable rows —
          never edits.
        </p>
      </div>

      <PaymentsKpiStrip kpis={kpis} />

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'payment' : 'payments'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={chargeOptions.length > 0}
        createLabel="Record payment"
        onCreate={openRecord}
        filters={
          <PaymentsTableFilters
            methodFilter={methodFilter}
            onMethodChange={setMethodFilter}
            sourceFilter={sourceFilter}
            onSourceChange={setSourceFilter}
          />
        }
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable={false}
      />

      <RecordPaymentDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        form={recordForm}
        onFormChange={(patch) => setRecordForm((f) => ({ ...f, ...patch }))}
        chargeOptions={chargeOptions}
        onSubmit={() => actions.runRecord(recordForm, () => setRecordOpen(false))}
        pending={pending}
      />
      <ReversePaymentDialog
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
    </div>
  );
}
