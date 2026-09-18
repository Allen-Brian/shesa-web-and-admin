'use client';

import { useRouter } from 'next/navigation';
import {
  ConfirmDialog,
  DataTable,
  EntityTablePanel,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type MassActions,
} from '@shesa/ui';
import { useMemo, useState, useTransition } from 'react';

import { deleteNominations } from '../actions/voting-actions';
import type { NominationRow } from '../voting-types';
import { watDate } from '../wat';

/**
 * Every nomination for one award, exactly as it arrived.
 *
 * A nomination has no state — it is a nomination. This screen exists to read
 * what members wrote and to remove anything that is not a real submission;
 * the decision about who goes on the ballot is made one tab across, where
 * the five rows naming one person are a single row with a count.
 */
export function NominationsPanel({
  nominations,
}: {
  readonly nominations: readonly NominationRow[];
}) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<NominationRow> | null>(null);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<readonly NominationRow[] | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return nominations;
    return nominations.filter(
      (n) =>
        n.nomineeName.toLowerCase().includes(q) ||
        n.citation.toLowerCase().includes(q) ||
        (n.nominatorName ?? '').toLowerCase().includes(q),
    );
  }, [nominations, search]);

  const columnDefs = useMemo<ColDef<NominationRow>[]>(
    () => [
      {
        headerName: 'Nominee',
        field: 'nomineeName',
        flex: 1,
        minWidth: 180,
        cellRenderer: (p: ICellRendererParams<NominationRow>) => {
          if (!p.data) return null;
          return (
            <span className="flex h-full flex-col justify-center leading-tight">
              <span className="font-medium text-foreground">{p.data.nomineeName}</span>
              <span className="text-xs text-muted-foreground">
                {[p.data.nomineeBatchYear, p.data.nomineeBranchLabel].filter(Boolean).join(' · ') ||
                  '—'}
              </span>
            </span>
          );
        },
      },
      {
        headerName: 'Why',
        field: 'citation',
        flex: 3,
        minWidth: 300,
        sortable: false,
        cellClass: 'text-xs text-muted-foreground',
        tooltipField: 'citation',
      },
      {
        headerName: 'Nominated by',
        colId: 'nominator',
        flex: 1,
        minWidth: 170,
        sortable: false,
        valueGetter: (p) =>
          p.data?.nominatorName
            ? `${p.data.nominatorName}${p.data.nominatorBatchYear ? ` (${p.data.nominatorBatchYear})` : ''}`
            : 'Anonymous',
        cellClass: 'text-xs text-muted-foreground',
      },
      {
        headerName: 'Contact',
        colId: 'contact',
        field: 'nominatorContact',
        width: 170,
        initialHide: true,
        valueFormatter: (p) => p.value ?? '—',
        cellClass: 'text-xs text-muted-foreground',
      },
      {
        headerName: 'Received',
        colId: 'received',
        width: 140,
        valueGetter: (p) => (p.data ? watDate(p.data.createdAt, false) : ''),
        cellClass: 'text-xs text-muted-foreground',
      },
      {
        // Whether this row is being counted. An ungrouped nomination counts
        // towards nobody, which is the only thing on this screen that is a
        // problem rather than a fact.
        headerName: 'Counted under',
        colId: 'grouped',
        flex: 1,
        minWidth: 160,
        sortable: false,
        cellRenderer: (p: ICellRendererParams<NominationRow>) =>
          p.data?.nomineeId ? (
            <span className="text-xs text-muted-foreground">Grouped</span>
          ) : (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Not grouped
            </span>
          ),
      },
    ],
    [],
  );

  const massActions = useMemo<MassActions<NominationRow>>(
    () => ({
      itemName: 'nomination',
      onDelete: (selected) => setConfirm(selected),
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'nomination' : 'nominations'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        hideCreate
        canCreate={false}
        createLabel=""
        onCreate={() => undefined}
      />

      <DataTable<NominationRow>
        rowData={filtered as NominationRow[]}
        columnDefs={columnDefs}
        getRowId={(params) => params.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        massActions={massActions}
      />

      <ConfirmDialog
        open={confirm !== null}
        title={`Delete ${confirm?.length ?? 0} nomination${confirm?.length === 1 ? '' : 's'}?`}
        description="The citation goes with it and this cannot be undone. Delete a nomination when it is not a real submission — not because you disagree with it, since who goes on the ballot is decided on the Nominees tab."
        confirmLabel="Delete"
        onConfirm={() => {
          const targets = confirm;
          setConfirm(null);
          if (!targets) return;
          startTransition(async () => {
            const res = await deleteNominations(targets.map((t) => t.id));
            if (res.ok) {
              toast.success(`Deleted ${targets.length}.`);
              gridApi?.deselectAll();
              router.refresh();
            } else {
              toast.error(res.message);
            }
          });
        }}
        onCancel={() => setConfirm(null)}
      />

      {pending && <span className="sr-only">Working…</span>}
    </div>
  );
}
