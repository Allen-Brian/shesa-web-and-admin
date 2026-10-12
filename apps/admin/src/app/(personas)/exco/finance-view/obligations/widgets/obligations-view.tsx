'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  DataTable,
  EntityTablePanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  type GridApi,
} from '@shesa/ui';

import { recordObligationPayment } from '../obligation-actions';
import { KpiStrip } from './kpi-strip';
import { PaymentDialog } from './payment-dialog';
import { buildDraft } from './build-draft';
import type { ObligationRow, PaymentDraft, SerialRow } from './obligation-widget-types';
import { useObligationColumns } from './use-obligation-columns';

export type { ObligationRow } from './obligation-widget-types';

interface Props {
  readonly rows: readonly ObligationRow[];
}

/**
 * Branch-admin view of the obligations imposed on their branch by
 * Mainstream. Each row is one period of a Mainstream-created charge
 * targeted at this branch-as-body — click through to record a payment
 * against it.
 */
export function ExcoObligationsView({ rows }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [draft, setDraft] = useState<PaymentDraft | null>(null);

  const filtered = useMemo<readonly SerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (!q) return true;
        return (
          r.chargeName.toLowerCase().includes(q) ||
          r.branchName.toLowerCase().includes(q) ||
          r.imposerName.toLowerCase().includes(q)
        );
      })
      .map((r, i) => ({ ...r, serial: i + 1 }));
  }, [rows, search, statusFilter]);

  const openPayment = (row: ObligationRow) => setDraft(buildDraft(row));

  const runRecord = () => {
    if (!draft) return;
    const parsed = parseFloat(draft.amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error('Enter an amount greater than zero.');
      return;
    }
    if (parsed > draft.row.outstanding + 0.01 && draft.row.outstanding > 0) {
      toast.error(
        `Only ${new Intl.NumberFormat().format(draft.row.outstanding)} ${draft.row.currency} remaining on this obligation.`,
      );
      return;
    }
    const target = draft;
    startTransition(async () => {
      const result = await recordObligationPayment({
        obligationId: target.row.id,
        amount: parsed,
        currency: target.row.currency,
        method: target.method,
        memo: target.memo.trim() || undefined,
        externalRef: target.externalRef.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Payment recorded.');
      setDraft(null);
      router.refresh();
    });
  };

  const columnDefs = useObligationColumns({ onOpenPayment: openPayment });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <KpiStrip rows={rows} />

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'obligation' : 'obligations'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={false}
        hideCreate
        createLabel=""
        onCreate={() => undefined}
        filters={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="forgiven">Forgiven</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={(e) => {
          if (!e.data) return;
          if (e.data.status === 'paid' || e.data.status === 'cancelled') return;
          openPayment(e.data);
        }}
        showColumnPicker={false}
        selectable={false}
      />

      <PaymentDialog
        draft={draft}
        pending={pending}
        onChange={(next) => setDraft(next)}
        onClose={() => setDraft(null)}
        onConfirm={runRecord}
      />
    </div>
  );
}
