'use client';

import { useRouter } from 'next/navigation';
import {
  Button,
  ConfirmDialog,
  DataTable,
  EntityTablePanel,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type MassActions,
  type RowClickedEvent,
} from '@shesa/ui';
import { Unlink, Users } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

import {
  assignNominations,
  deleteNominations,
  groupUnderNewNominee,
} from '../actions/voting-actions';
import type { NominationRow, NomineeRow } from '../voting-types';
import { watDate } from '../wat';

import { CLAMPED_ROW_HEIGHT, ClampedCell, serialColumn } from './clamped-cell';
import { NomineePickerDialog } from './nominee-picker-dialog';
import { NominationDetailSheet } from './voting-sheets';

type Filter = 'all' | 'grouped' | 'ungrouped';

/**
 * Every nomination for one award, exactly as it arrived.
 *
 * A nomination has no state — it is a nomination. What this screen decides
 * is only which person each one is counted against, because a nomination
 * grouped under nobody is missing from every total on the People tab. The
 * filter makes both halves visible: what has been placed, and what has not.
 */
export function NominationsPanel({
  awardId,
  nominations,
  nominees,
}: {
  readonly awardId: string;
  readonly nominations: readonly NominationRow[];
  readonly nominees: readonly NomineeRow[];
}) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<NominationRow> | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [grouping, setGrouping] = useState<readonly NominationRow[] | null>(null);
  const [confirm, setConfirm] = useState<readonly NominationRow[] | null>(null);
  const [viewing, setViewing] = useState<NominationRow | null>(null);
  const [pending, startTransition] = useTransition();

  const nomineeName = useMemo(
    () => new Map(nominees.map((n) => [n.id, n.displayName])),
    [nominees],
  );

  const counts = useMemo(
    () => ({
      all: nominations.length,
      grouped: nominations.filter((n) => n.nomineeId).length,
      ungrouped: nominations.filter((n) => !n.nomineeId).length,
    }),
    [nominations],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return nominations.filter((n) => {
      if (filter === 'grouped' && !n.nomineeId) return false;
      if (filter === 'ungrouped' && n.nomineeId) return false;
      if (!q) return true;
      return (
        n.nomineeName.toLowerCase().includes(q) ||
        n.citation.toLowerCase().includes(q) ||
        (n.nominatorName ?? '').toLowerCase().includes(q)
      );
    });
  }, [filter, nominations, search]);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, success: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        gridApi?.deselectAll();
        setGrouping(null);
        router.refresh();
      } else {
        toast.error(res.message ?? 'That did not work.');
      }
    });

  const columnDefs = useMemo<ColDef<NominationRow>[]>(
    () => [
      serialColumn<NominationRow>(),
      {
        headerName: 'As submitted',
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
        // The whole point of the screen: which person this row is counted
        // against, and whether it is counted at all.
        headerName: 'Counted under',
        colId: 'grouped',
        flex: 1,
        minWidth: 190,
        valueGetter: (p) =>
          p.data?.nomineeId ? (nomineeName.get(p.data.nomineeId) ?? 'Unknown') : '',
        cellRenderer: (p: ICellRendererParams<NominationRow>) => {
          if (!p.data) return null;
          if (!p.data.nomineeId) {
            return (
              <span className="flex h-full items-center gap-2">
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Not grouped
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7"
                  disabled={pending}
                  onClick={(e) => {
                    e.stopPropagation();
                    setGrouping([p.data as NominationRow]);
                  }}
                >
                  Group
                </Button>
              </span>
            );
          }
          const name = nomineeName.get(p.data.nomineeId) ?? 'Unknown';
          const different = name.trim().toLowerCase() !== p.data.nomineeName.trim().toLowerCase();
          return (
            <span className="flex h-full items-center gap-1.5">
              <span className="text-sm text-foreground">{name}</span>
              {different && (
                <span className="text-[11px] text-muted-foreground">(spelled differently)</span>
              )}
            </span>
          );
        },
      },
      {
        headerName: 'Why',
        field: 'citation',
        flex: 3,
        minWidth: 280,
        sortable: false,
        cellRenderer: (p: ICellRendererParams<NominationRow, string>) => (
          <ClampedCell text={p.value} />
        ),
      },
      {
        headerName: 'Nominated by',
        colId: 'nominator',
        flex: 1,
        minWidth: 160,
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
        width: 130,
        valueGetter: (p) => (p.data ? watDate(p.data.createdAt, false) : ''),
        cellClass: 'text-xs text-muted-foreground',
      },
    ],
    [nomineeName, pending],
  );

  const massActions = useMemo<MassActions<NominationRow>>(
    () => ({
      itemName: 'nomination',
      onDelete: (selected) => setConfirm(selected),
      custom: [
        {
          label: 'Group under a person',
          icon: <Users className="h-4 w-4" />,
          onClick: (selected: NominationRow[]) => setGrouping(selected),
        },
        {
          label: 'Ungroup',
          icon: <Unlink className="h-4 w-4" />,
          onClick: (selected: NominationRow[]) =>
            run(
              () =>
                assignNominations(
                  selected.map((s) => s.id),
                  null,
                ),
              'Returned to the ungrouped pile.',
            ),
        },
      ],
    }),
    [gridApi],
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
        filters={
          <div className="flex items-center gap-1">
            {(
              [
                ['all', 'All'],
                ['grouped', 'Grouped'],
                ['ungrouped', 'Not grouped'],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={filter === value ? 'default' : 'ghost'}
                onClick={() => setFilter(value)}
              >
                {label}
                <span className="ml-1.5 tabular-nums opacity-70">{counts[value]}</span>
              </Button>
            ))}
          </div>
        }
      />

      <DataTable<NominationRow>
        rowData={filtered as NominationRow[]}
        columnDefs={columnDefs}
        getRowId={(params) => params.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={(e: RowClickedEvent<NominationRow>) => e.data && setViewing(e.data)}
        rowHeight={CLAMPED_ROW_HEIGHT}
        showColumnPicker={false}
        selectionPinned={false}
        massActions={massActions}
      />

      <NominationDetailSheet
        nomination={viewing}
        nomineeName={viewing?.nomineeId ? (nomineeName.get(viewing.nomineeId) ?? null) : null}
        onClose={() => setViewing(null)}
      />

      <NomineePickerDialog
        open={grouping !== null}
        onOpenChange={(o) => !o && setGrouping(null)}
        title={`Group ${grouping?.length ?? 0} nomination${grouping?.length === 1 ? '' : 's'}`}
        description="Pick the person these should be counted against. Moving a nomination changes the counts on the People tab and nothing else — the citation stays exactly as it was written."
        nominees={nominees}
        // Seeded from the row's own spelling, which is the name being placed.
        newNameSuggestion={grouping?.length === 1 ? grouping[0]?.nomineeName : undefined}
        confirmLabel="Group"
        pending={pending}
        onPick={(nomineeId) =>
          run(
            () =>
              assignNominations(
                (grouping ?? []).map((g) => g.id),
                nomineeId,
              ),
            'Grouped. The counts on the People tab have moved.',
          )
        }
        onCreateNew={(name) =>
          run(
            () =>
              groupUnderNewNominee(
                awardId,
                name,
                (grouping ?? []).map((g) => g.id),
              ),
            `Started “${name}” and grouped ${grouping?.length ?? 0} under them.`,
          )
        }
      />

      <ConfirmDialog
        open={confirm !== null}
        title={`Delete ${confirm?.length ?? 0} nomination${confirm?.length === 1 ? '' : 's'}?`}
        description="The citation goes with it and this cannot be undone. Delete a nomination when it is not a real submission — not because you disagree with it, since who goes on the ballot is decided on the People tab."
        confirmLabel="Delete"
        onConfirm={() => {
          const targets = confirm;
          setConfirm(null);
          if (!targets) return;
          run(() => deleteNominations(targets.map((t) => t.id)), `Deleted ${targets.length}.`);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
