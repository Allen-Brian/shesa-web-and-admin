'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Check, X } from 'lucide-react';

import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EntityTablePanel,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type RowClickedEvent,
} from '@shesa/ui';

import { approveTransfer } from '../../../actions';
import type { TransferRow } from './switcher';

interface TransfersPanelProps {
  readonly transfers: readonly TransferRow[];
}

type SerialRow = TransferRow & { readonly serial: number };

/**
 * Incoming transfers panel (destination view). Per the M1 flip:
 *   - This scope is the DESTINATION of every row here.
 *   - Approving fires memberships/approve-transfer (destination-scoped).
 *   - The source scope's admin gets a notification event after approval.
 *
 * Deny is stubbed pending its Edge Function.
 */
export function TransfersPanel({ transfers }: TransfersPanelProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TransferRow | null>(null);
  const [confirmDeny, setConfirmDeny] = useState<TransferRow | null>(null);
  const [pending, startTransition] = useTransition();

  const numbered = useMemo<readonly SerialRow[]>(
    () => transfers.map((r, i) => ({ ...r, serial: i + 1 })),
    [transfers],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return numbered;
    return numbered.filter((r) => {
      if (r.full_name.toLowerCase().includes(q)) return true;
      if (r.batch_name?.toLowerCase().includes(q)) return true;
      if (r.email?.toLowerCase().includes(q)) return true;
      if (r.source_scope_name.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [numbered, search]);

  const runApprove = (row: TransferRow) => {
    startTransition(async () => {
      const result = await approveTransfer(row.transfer_id);
      if (!result.ok) {
        toast.error(result.message ?? 'Could not approve transfer.');
        return;
      }
      toast.success(`${row.full_name} transferred from ${row.source_scope_name}.`);
      setSelected(null);
      router.refresh();
    });
  };

  const runDeny = () => {
    toast.warning('Transfer denial is not implemented yet.');
    setSelected(null);
  };

  const columnDefs = useMemo<ColDef<SerialRow>[]>(
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
      { headerName: 'Name', field: 'full_name', flex: 2, minWidth: 200 },
      {
        headerName: 'Batch',
        field: 'batch_name',
        width: 140,
        valueFormatter: (p) => p.value ?? '—',
      },
      {
        headerName: 'From',
        field: 'source_scope_name',
        flex: 1.5,
        minWidth: 180,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
          <span className="inline-flex items-center gap-1">
            <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
            {p.value ?? '—'}
          </span>
        ),
      },
      {
        headerName: 'Email',
        field: 'email',
        flex: 1.5,
        minWidth: 180,
        valueFormatter: (p) => p.value ?? '—',
      },
      {
        headerName: 'Requested',
        field: 'requested_at',
        width: 140,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
      },
    ],
    [],
  );

  const onRowClicked = (e: RowClickedEvent<SerialRow>) => {
    if (!e.data) return;
    setSelected(e.data);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'transfer' : 'transfers'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={false}
        hideCreate
        createLabel=""
        onCreate={() => undefined}
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.transfer_id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={onRowClicked}
        showColumnPicker={false}
        selectable={false}
      />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.full_name}</DialogTitle>
                <DialogDescription>
                  <span className="inline-flex items-center gap-1">
                    Incoming transfer from
                    <Badge variant="outline" className="gap-1 text-xs">
                      <ArrowLeftRight className="h-3 w-3" />
                      {selected.source_scope_name}
                    </Badge>
                  </span>
                </DialogDescription>
              </DialogHeader>
              <DetailBlock row={selected} />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => setConfirmDeny(selected)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                  Deny
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => runApprove(selected)}
                >
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeny}
        title={confirmDeny ? `Deny transfer for ${confirmDeny.full_name}?` : ''}
        description="The member keeps their existing membership at their source scope. The requester is notified. (Note: denial flow is stubbed pending its Edge Function.)"
        confirmLabel="Deny"
        onConfirm={() => {
          setConfirmDeny(null);
          runDeny();
        }}
        onCancel={() => setConfirmDeny(null)}
      />
    </div>
  );
}

function DetailBlock({ row }: { readonly row: TransferRow }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
      <Detail k="Batch" v={row.batch_name ?? '—'} />
      <Detail k="Email" v={row.email ?? '—'} />
      <Detail k="Phone" v={row.phone ?? '—'} />
      <Detail k="From" v={row.source_scope_name} />
      <Detail k="Requested" v={new Date(row.requested_at).toLocaleString()} />
      {row.reason && (
        <div className="flex flex-col gap-1 border-t border-border pt-2">
          <span className="text-xs text-muted-foreground">Reason</span>
          <span className="text-sm italic text-foreground">&ldquo;{row.reason}&rdquo;</span>
        </div>
      )}
    </div>
  );
}

function Detail({ k, v }: { readonly k: string; readonly v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className="text-sm text-foreground">{v}</span>
    </div>
  );
}
