'use client';

import { useMemo, useState } from 'react';
import { Activity } from 'lucide-react';

import {
  Alert,
  AlertDescription,
  DataTable,
  EntityTablePanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type GridApi,
} from '@shesa/ui';

import { ExportButton } from '@/components/export-button';
import { GatewayDetailSheet } from '@/components/finance/gateway-detail-sheet';
import { activeFilters } from '@/lib/export/filters';

import { buildPaymentAttemptsExport } from './payment-attempts-export';
import { buildPaymentAttemptColumns } from './payment-attempt-columns';
import type {
  AttemptStatusFilter,
  PaymentAttemptRow,
  SerialPaymentAttemptRow,
} from './payment-attempt-types';

interface Props {
  readonly attempts: readonly PaymentAttemptRow[];
}

/**
 * Payment attempts — every try, from the moment the row is written.
 *
 * A row appears here before the gateway has even been called, which is the
 * point: if the gateway call fails, or the payer never arrives, this is the
 * only trace that somebody tried. Transactions shows what settled; this
 * shows what happened.
 */
export function PaymentAttemptsView({ attempts }: Props) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AttemptStatusFilter>('all');
  const [gridApi, setGridApi] = useState<GridApi<SerialPaymentAttemptRow> | null>(null);
  const [selected, setSelected] = useState<PaymentAttemptRow | null>(null);
  const columnDefs = useMemo(() => buildPaymentAttemptColumns(), []);

  const filtered = useMemo<readonly SerialPaymentAttemptRow[]>(() => {
    const q = search.trim().toLowerCase();
    return attempts
      .filter((a) => {
        if (status === 'open' && a.status !== 'initiated' && a.status !== 'pending') return false;
        if (status === 'settled' && a.status !== 'succeeded') return false;
        if (
          status === 'unsuccessful' &&
          a.status !== 'failed' &&
          a.status !== 'cancelled' &&
          a.status !== 'expired'
        ) {
          return false;
        }
        if (!q) return true;
        return (
          a.chargeName.toLowerCase().includes(q) ||
          a.payerLabel.toLowerCase().includes(q) ||
          (a.gatewayRef ?? '').toLowerCase().includes(q) ||
          (a.payerPhone ?? '').toLowerCase().includes(q) ||
          (a.payerEmail ?? '').toLowerCase().includes(q)
        );
      })
      .map((a, i) => ({ ...a, serial: i + 1 }));
  }, [attempts, search, status]);

  // Stuck at `initiated` means the gateway was never successfully called —
  // our side, not the payer's. Worth surfacing rather than leaving to be
  // noticed.
  const stuck = attempts.filter((a) => a.status === 'initiated').length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Activity className="h-5 w-5 text-primary" />
          Payment attempts
        </h1>
        <p className="text-sm text-muted-foreground">
          Every attempt to pay, recorded before the gateway is called and updated as it progresses.
          Transactions shows the money that settled; this shows what happened on the way — including
          the tries that did not.
        </p>
      </div>

      {stuck > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            {stuck === 1
              ? 'One attempt never reached the gateway.'
              : `${stuck} attempts never reached the gateway.`}{' '}
            They are stuck at <span className="font-medium">initiated</span>, which means the
            request failed on our side — nobody is waiting on a payer.
          </AlertDescription>
        </Alert>
      )}

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'attempt' : 'attempts'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        hideCreate
        canCreate={false}
        createLabel=""
        onCreate={() => undefined}
        actions={
          <ExportButton
            spec={() =>
              buildPaymentAttemptsExport(
                filtered,
                activeFilters({ Search: search.trim(), Status: status }),
              )
            }
            disabled={filtered.length === 0}
          />
        }
        filters={
          <Select value={status} onValueChange={(v) => setStatus(v as AttemptStatusFilter)}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All attempts</SelectItem>
              <SelectItem value="open">In progress</SelectItem>
              <SelectItem value="settled">Settled</SelectItem>
              <SelectItem value="unsuccessful">Unsuccessful</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <DataTable<SerialPaymentAttemptRow>
        rowData={filtered as SerialPaymentAttemptRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable={false}
        onRowClicked={(e) => e.data && setSelected(e.data)}
      />

      <GatewayDetailSheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.chargeName ?? ''}
        subtitle={selected ? selected.scopeName : null}
        badges={
          selected
            ? [
                { label: selected.status },
                ...(selected.mode === 'sandbox'
                  ? [{ label: 'test', className: 'border-amber-500/40 text-amber-700' }]
                  : []),
              ]
            : []
        }
        sections={
          selected
            ? [
                {
                  title: 'Payer',
                  fields: [
                    { label: 'Name', value: selected.payerLabel },
                    { label: 'Member', value: selected.isMember ? 'Yes' : 'No' },
                    { label: 'Phone', value: selected.payerPhone },
                    { label: 'Email', value: selected.payerEmail },
                  ],
                },
                {
                  title: 'Asked for',
                  fields: [
                    {
                      label: 'Amount',
                      value: `${selected.amount.toLocaleString()} ${selected.currency}`,
                    },
                    {
                      label: 'Quantity',
                      value: selected.quantity == null ? null : String(selected.quantity),
                    },
                    // Null until the gateway reports what was actually used.
                    { label: 'Method', value: selected.method },
                    { label: 'Note', value: selected.note },
                  ],
                },
                {
                  title: 'Progress',
                  fields: [
                    { label: 'Status', value: selected.status },
                    { label: 'Started', value: new Date(selected.createdAt).toLocaleString() },
                    { label: 'Updated', value: new Date(selected.updatedAt).toLocaleString() },
                    { label: 'Why it failed', value: selected.failureReason },
                  ],
                },
                {
                  title: 'References',
                  fields: [
                    { label: 'Provider', value: selected.provider },
                    {
                      label: 'Gateway request',
                      value: selected.gatewayRef,
                      mono: true,
                      copyable: true,
                    },
                    { label: 'Attempt', value: selected.id, mono: true, copyable: true },
                    {
                      label: 'Settlement',
                      value: selected.settlementId,
                      mono: true,
                      copyable: true,
                    },
                  ],
                },
              ]
            : []
        }
      />
    </div>
  );
}
