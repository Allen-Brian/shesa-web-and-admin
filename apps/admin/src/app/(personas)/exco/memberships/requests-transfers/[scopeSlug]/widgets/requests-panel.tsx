'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';

import {
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
  type RowClickedEvent,
} from '@shesa/ui';

import { approveJoinRequest, rejectJoinRequest } from '../../../actions';
import type { RequestRow } from './switcher';

interface RequestsPanelProps {
  readonly requests: readonly RequestRow[];
}

type SerialRow = RequestRow & { readonly serial: number };

export function RequestsPanel({ requests }: RequestsPanelProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [confirmReject, setConfirmReject] = useState<RequestRow | null>(null);
  const [pending, startTransition] = useTransition();

  const numbered = useMemo<readonly SerialRow[]>(
    () => requests.map((r, i) => ({ ...r, serial: i + 1 })),
    [requests],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return numbered;
    return numbered.filter((r) => {
      if (r.full_name.toLowerCase().includes(q)) return true;
      if (r.batch_name?.toLowerCase().includes(q)) return true;
      if (r.email?.toLowerCase().includes(q)) return true;
      if (r.phone?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [numbered, search]);

  const runApprove = (row: RequestRow) => {
    startTransition(async () => {
      const result = await approveJoinRequest(row.membership_id);
      if (!result.ok) {
        toast.error(result.message ?? 'Could not approve.');
        return;
      }
      toast.success(`${row.full_name} joined.`);
      setSelected(null);
      router.refresh();
    });
  };

  const runReject = (row: RequestRow) => {
    startTransition(async () => {
      const result = await rejectJoinRequest(row.membership_id);
      if (!result.ok) {
        toast.error(result.message ?? 'Could not reject.');
        return;
      }
      toast.success(`${row.full_name}'s request rejected.`);
      setSelected(null);
      router.refresh();
    });
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
        headerName: 'Email',
        field: 'email',
        flex: 1.5,
        minWidth: 180,
        valueFormatter: (p) => p.value ?? '—',
      },
      { headerName: 'Phone', field: 'phone', width: 140, valueFormatter: (p) => p.value ?? '—' },
      {
        headerName: 'Method',
        field: 'join_method',
        width: 130,
        cellClass: 'font-mono text-xs',
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
        countLabel={filtered.length === 1 ? 'request' : 'requests'}
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
        getRowId={(p) => p.data.membership_id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={onRowClicked}
        showColumnPicker={false}
        selectable={false}
      />

      {/* ── Row-click dialog ── */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.full_name}</DialogTitle>
                <DialogDescription>Pending join request.</DialogDescription>
              </DialogHeader>
              <DetailBlock row={selected} />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => setConfirmReject(selected)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                  Reject
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
        open={!!confirmReject}
        title={confirmReject ? `Reject ${confirmReject.full_name}?` : ''}
        description="The request is rejected and the pending membership row is closed. The member is notified and can re-request later."
        confirmLabel="Reject"
        onConfirm={() => {
          if (!confirmReject) return;
          const target = confirmReject;
          setConfirmReject(null);
          runReject(target);
        }}
        onCancel={() => setConfirmReject(null)}
      />
    </div>
  );
}

function DetailBlock({ row }: { readonly row: RequestRow }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
      <Detail k="Batch" v={row.batch_name ?? '—'} />
      <Detail k="Email" v={row.email ?? '—'} />
      <Detail k="Phone" v={row.phone ?? '—'} />
      <Detail k="Method" v={row.join_method} mono />
      <Detail k="Requested" v={new Date(row.requested_at).toLocaleString()} />
    </div>
  );
}

function Detail({
  k,
  v,
  mono,
}: {
  readonly k: string;
  readonly v: string;
  readonly mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className={mono ? 'text-sm font-mono' : 'text-sm text-foreground'}>{v}</span>
    </div>
  );
}
