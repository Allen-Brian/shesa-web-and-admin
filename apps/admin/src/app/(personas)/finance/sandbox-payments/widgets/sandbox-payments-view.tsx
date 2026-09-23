'use client';

import { useMemo, useState } from 'react';
import { FlaskConical } from 'lucide-react';

import { Alert, AlertDescription, DataTable, EntityTablePanel, type GridApi } from '@shesa/ui';

import { ExportButton } from '@/components/export-button';
import { GatewayDetailSheet } from '@/components/finance/gateway-detail-sheet';
import { activeFilters } from '@/lib/export/filters';

import { buildSandboxPaymentsExport } from './sandbox-payments-export';
import { buildSandboxPaymentColumns } from './sandbox-payment-columns';
import type { SandboxPaymentRow, SerialSandboxPaymentRow } from './sandbox-payment-types';

interface Props {
  readonly payments: readonly SandboxPaymentRow[];
  /** What TRANZAK_MODE is set to right now, for the banner. */
  readonly mode: string | null;
}

/**
 * Sandbox payments — every settlement recorded against the Tranzak
 * sandbox.
 *
 * Kept out of Transactions on purpose. These rows are not in the books:
 * they write no ledger entry, move no treasury balance and mint no
 * receipt, so mixing them into the real payments table would mean every
 * total on every page had to remember to exclude them. Separate table,
 * separate page, nothing to remember.
 */
export function SandboxPaymentsView({ payments, mode }: Props) {
  const [search, setSearch] = useState('');
  const [gridApi, setGridApi] = useState<GridApi<SerialSandboxPaymentRow> | null>(null);
  const [selected, setSelected] = useState<SandboxPaymentRow | null>(null);
  const columnDefs = useMemo(() => buildSandboxPaymentColumns(), []);

  const filtered = useMemo<readonly SerialSandboxPaymentRow[]>(() => {
    const q = search.trim().toLowerCase();
    return payments
      .filter((p) => {
        if (!q) return true;
        return (
          p.chargeName.toLowerCase().includes(q) ||
          p.payerLabel.toLowerCase().includes(q) ||
          (p.providerRef ?? '').toLowerCase().includes(q) ||
          (p.providerTransactionId ?? '').toLowerCase().includes(q) ||
          (p.providerStatus ?? '').toLowerCase().includes(q)
        );
      })
      .map((p, i) => ({ ...p, serial: i + 1 }));
  }, [payments, search]);

  const mismatches = payments.filter((p) => p.gatewayAmount != null && !p.reconciles).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FlaskConical className="h-5 w-5 text-primary" />
          Sandbox payments
        </h1>
        <p className="text-sm text-muted-foreground">
          Test settlements against the Tranzak sandbox. Nothing here reaches the ledger, the
          treasury or a receipt — these rows exist so a payment can be exercised end to end without
          touching the books.
        </p>
      </div>

      {mode !== 'sandbox' && (
        <Alert>
          <AlertDescription>
            <span className="font-medium">TRANZAK_MODE is {mode ?? 'not set'}.</span> New payments
            are settling into the real books, not here. This page is showing test settlements
            recorded earlier.
          </AlertDescription>
        </Alert>
      )}

      {mismatches > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            {mismatches === 1
              ? 'One settlement does not match what was asked for.'
              : `${mismatches} settlements do not match what was asked for.`}{' '}
            The gateway reported a different gross or currency. In live mode these would have been
            refused rather than recorded.
          </AlertDescription>
        </Alert>
      )}

      {/* Read-only surface: settlements arrive from the gateway, never
          from this page, so the panel's Create affordance is hidden. */}
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'settlement' : 'settlements'}
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
              buildSandboxPaymentsExport(
                filtered,
                activeFilters({ Search: search.trim(), Mode: mode }),
              )
            }
            disabled={filtered.length === 0}
          />
        }
      />
      <DataTable<SerialSandboxPaymentRow>
        rowData={filtered as SerialSandboxPaymentRow[]}
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
        subtitle={selected ? `${selected.scopeName} · test settlement` : null}
        badges={
          selected
            ? [
                { label: selected.providerStatus ?? 'unknown' },
                { label: 'test', className: 'border-amber-500/40 text-amber-700' },
              ]
            : []
        }
        link={
          selected
            ? { href: `/agm-2026/receipt/sandbox-${selected.id}`, label: 'View the test receipt' }
            : null
        }
        sections={
          selected
            ? [
                {
                  title: 'Payer',
                  fields: [
                    { label: 'Name', value: selected.payerLabel },
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
                    { label: 'Method', value: selected.method },
                  ],
                },
                {
                  title: 'Gateway reported',
                  fields: [
                    {
                      label: 'Gross',
                      value:
                        selected.gatewayAmount == null
                          ? null
                          : `${selected.gatewayAmount.toLocaleString()} ${selected.gatewayCurrency ?? ''}`.trim(),
                    },
                    {
                      label: 'Fee',
                      value:
                        selected.gatewayFee == null ? null : selected.gatewayFee.toLocaleString(),
                    },
                    {
                      label: 'Net received',
                      value:
                        selected.gatewayNetAmount == null
                          ? null
                          : selected.gatewayNetAmount.toLocaleString(),
                    },
                    { label: 'Status', value: selected.providerStatus },
                    { label: 'Reconciles', value: selected.reconciles ? 'Yes' : 'No' },
                  ],
                },
                {
                  title: 'References',
                  fields: [
                    {
                      label: 'Request',
                      value: selected.providerRef,
                      mono: true,
                      copyable: true,
                    },
                    {
                      label: 'Transaction',
                      value: selected.providerTransactionId,
                      mono: true,
                      copyable: true,
                    },
                    { label: 'Intent', value: selected.intentId, mono: true, copyable: true },
                    { label: 'Settlement', value: selected.id, mono: true, copyable: true },
                  ],
                },
              ]
            : []
        }
      />
    </div>
  );
}
