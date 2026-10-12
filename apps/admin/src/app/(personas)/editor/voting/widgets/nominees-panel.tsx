'use client';

import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  EntityTablePanel,
  Input,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type MassActions,
  type RowClickedEvent,
} from '@shesa/ui';
import { DropdownMenuTrigger } from '@shesa/ui';
import { Check, Combine, Layers, Merge, MoreHorizontal, Pencil, UserPlus, X } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

import {
  aggregateAward,
  createNominee,
  deleteNominee,
  mergeManyNominees,
  mergeNominees,
  promoteNominees,
  renameNominee,
} from '../actions/voting-actions';
import type { MergeSuggestion, NominationRow, NomineeRow } from '../voting-types';

import { CLAMPED_ROW_HEIGHT, ClampedCell, serialColumn } from './clamped-cell';
import { NomineePickerDialog } from './nominee-picker-dialog';
import { NomineeDetailSheet } from './voting-sheets';

/**
 * The people nominated for one award, with how many times each was named.
 *
 * This is the screen the work happens on. A nomination has no approval state
 * — it is a nomination — so the only decision is which of these people go on
 * the ballot. Select them and forward them; everything else here exists to
 * make that list correct first.
 *
 * Correct means the spellings are reconciled. "Fru John Doe Che" and "John
 * Doe Fru" are one man, and a count that treats them as two is wrong in a
 * way nobody notices. Aggregate groups the exact matches; the suggestions
 * propose the rest and never act on their own.
 */
export function NomineesPanel({
  awardId,
  awardName,
  nominees,
  nominations,
  suggestions,
}: {
  readonly awardId: string;
  readonly awardName: string;
  readonly nominees: readonly NomineeRow[];
  readonly nominations: readonly NominationRow[];
  readonly suggestions: readonly MergeSuggestion[];
}) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<NomineeRow> | null>(null);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [merging, setMerging] = useState<MergeSuggestion | null>(null);
  const [dissolving, setDissolving] = useState<readonly NomineeRow[] | null>(null);
  const [mergingMany, setMergingMany] = useState<readonly NomineeRow[] | null>(null);
  const [viewing, setViewing] = useState<NomineeRow | null>(null);
  const [pending, startTransition] = useTransition();

  /**
   * Batch, branch and every spelling, per person — derived from their own
   * nominations rather than stored on the group, because a group is a name
   * and the facts about the person live on what members submitted.
   */
  const details = useMemo(() => {
    const m = new Map<
      string,
      { batch: string; branch: string; spellings: string; spellingCount: number }
    >();
    for (const b of nominees) {
      const mine = nominations.filter((n) => n.nomineeId === b.id);
      const spellings = [...new Set(mine.map((n) => n.nomineeName.trim()))];
      const batches = [...new Set(mine.map((n) => n.nomineeBatchYear).filter(Boolean))];
      const branches = [...new Set(mine.map((n) => n.nomineeBranchLabel).filter(Boolean))];
      m.set(b.id, {
        batch: batches.join(', '),
        branch: branches.join(', '),
        spellings: spellings.join(', '),
        spellingCount: spellings.length,
      });
    }
    return m;
  }, [nominations, nominees]);

  const ungrouped = nominations.filter((n) => !n.nomineeId).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return nominees;
    return nominees.filter((n) => n.displayName.toLowerCase().includes(q));
  }, [nominees, search]);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, success: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        router.refresh();
      } else {
        toast.error(res.message ?? 'That did not work.');
      }
    });

  const aggregate = () =>
    startTransition(async () => {
      const res = await aggregateAward(awardId);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      const { created = 0, assigned = 0 } = res;
      toast.success(
        assigned === 0
          ? 'Nothing left to group — every nomination is already counted against a person.'
          : `${assigned} nomination${assigned === 1 ? '' : 's'} grouped into ${created} new ${
              created === 1 ? 'person' : 'people'
            }.`,
      );
      router.refresh();
    });

  const toBallot = (rows: readonly NomineeRow[]) => {
    const fresh = rows.filter((r) => !r.candidateId);
    if (fresh.length === 0) {
      toast.message('Those are already on the ballot.');
      return;
    }
    startTransition(async () => {
      const res = await promoteNominees(fresh.map((r) => r.id));
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        `${res.added} added to the ballot. Fill in professions and photographs on the Ballot tab.`,
      );
      gridApi?.deselectAll();
      router.refresh();
    });
  };

  const columnDefs = useMemo<ColDef<NomineeRow>[]>(
    () => [
      serialColumn<NomineeRow>(),
      {
        headerName: 'Person',
        field: 'displayName',
        flex: 2,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<NomineeRow>) => {
          if (!p.data) return null;
          return (
            <span className="flex h-full items-center gap-2">
              <span className="font-medium text-foreground">{p.data.displayName}</span>
              {p.data.candidateId && (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  On the ballot
                </Badge>
              )}
            </span>
          );
        },
      },
      {
        // Derived from the person's own nominations, and comma-joined when
        // members disagreed — two different batch years for one name is
        // itself worth seeing, since it usually means a wrong merge.
        headerName: 'Batch',
        colId: 'batch',
        width: 120,
        valueGetter: (p) => (p.data ? (details.get(p.data.id)?.batch ?? '') : ''),
        cellRenderer: (p: ICellRendererParams<NomineeRow, string>) =>
          p.value ? (
            <span className="text-sm tabular-nums text-foreground">{p.value}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        headerName: 'Branch',
        colId: 'branch',
        flex: 1,
        minWidth: 160,
        valueGetter: (p) => (p.data ? (details.get(p.data.id)?.branch ?? '') : ''),
        cellRenderer: (p: ICellRendererParams<NomineeRow, string>) => (
          <ClampedCell text={p.value} className="text-sm text-foreground" />
        ),
      },
      {
        headerName: 'Nominations',
        field: 'nominationCount',
        width: 140,
        type: 'numericColumn',
        sort: 'desc',
        cellRenderer: (p: ICellRendererParams<NomineeRow, number>) => (
          <span className={(p.value ?? 0) >= 3 ? 'font-semibold text-foreground' : ''}>
            {p.value}
          </span>
        ),
      },
      {
        // What members actually typed. A name here that is plainly somebody
        // else is how a wrong merge gets caught, so it is worth the width.
        headerName: 'Spellings received',
        colId: 'spellings',
        flex: 3,
        minWidth: 240,
        sortable: false,
        valueGetter: (p) => (p.data ? (details.get(p.data.id)?.spellings ?? '') : ''),
        cellRenderer: (p: ICellRendererParams<NomineeRow, string>) => (
          <ClampedCell text={p.value} />
        ),
      },
      {
        headerName: '',
        colId: 'actions',
        width: 64,
        maxWidth: 64,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<NomineeRow>) => {
          if (!p.data) return null;
          const row = p.data;
          return (
            <span className="flex h-full items-center justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-md p-0"
                    aria-label="Actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  {!row.candidateId && (
                    <DropdownMenuItem onClick={() => toBallot([row])}>
                      <UserPlus className="h-4 w-4" />
                      Add to ballot
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => setRenaming({ id: row.id, value: row.displayName })}
                  >
                    <Pencil className="h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDissolving([row])}
                  >
                    <X className="h-4 w-4" />
                    Remove this person
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          );
        },
      },
    ],
    // `toBallot` and the setters are stable for the grid's purposes.
    [details],
  );

  const massActions = useMemo<MassActions<NomineeRow>>(
    () => ({
      itemName: 'person',
      pluralItemName: 'people',
      custom: [
        {
          label: 'Add to ballot',
          icon: <UserPlus className="h-4 w-4" />,
          onClick: (selected: NomineeRow[]) => toBallot(selected),
        },
        {
          // Any two entries, not just the pairs the machine spotted. The
          // suggestions only catch shared words; a nickname or a maiden name
          // shares nothing with the name beside it and only a person knows.
          label: 'Merge into one person',
          icon: <Merge className="h-4 w-4" />,
          onClick: (selected: NomineeRow[]) => {
            if (selected.length < 2) {
              toast.message('Select at least two people to merge.');
              return;
            }
            setMergingMany(selected);
          },
        },
      ],
      onDelete: (selected) => setDissolving(selected),
    }),
    [pending],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Proposals, never actions. Fusing two real people who share a
          surname is the one failure this must not have. */}
      {suggestions.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Combine className="h-4 w-4" aria-hidden />
            {suggestions.length} possible {suggestions.length === 1 ? 'match' : 'matches'}
          </p>
          <p className="text-xs text-muted-foreground">
            These share every word of the shorter name. Only you can tell whether they are the same
            person.
          </p>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((s) => (
              <div
                key={`${s.leftId}-${s.rightId}`}
                className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-2"
              >
                <span className="text-sm text-foreground">
                  {s.leftName}{' '}
                  <span className="text-xs text-muted-foreground">({s.leftCount})</span>
                </span>
                <span className="text-xs text-muted-foreground">and</span>
                <span className="text-sm text-foreground">
                  {s.rightName}{' '}
                  <span className="text-xs text-muted-foreground">({s.rightCount})</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  disabled={pending}
                  onClick={() => setMerging(s)}
                >
                  Merge
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'person' : 'people'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={newName.trim().length >= 2}
        createLabel="Add person"
        onCreate={() =>
          run(async () => {
            const res = await createNominee(awardId, newName);
            if (res.ok) setNewName('');
            return res;
          }, 'Added.')
        }
        filters={
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Add a person by hand"
              className="h-8 w-[200px]"
              maxLength={200}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={aggregate}
              disabled={pending}
            >
              <Layers className="h-3.5 w-3.5" />
              Group nominations
              {ungrouped > 0 && (
                <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                  {ungrouped}
                </span>
              )}
            </Button>
          </div>
        }
      />

      {/* Never hidden: a nomination counted against nobody is a nomination
          missing from every total on this page. */}
      {ungrouped > 0 && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
          <strong className="text-foreground">
            {ungrouped} nomination{ungrouped === 1 ? '' : 's'} not yet grouped.
          </strong>{' '}
          They count towards nobody until you press Group nominations.
        </p>
      )}

      <DataTable<NomineeRow>
        rowData={filtered as NomineeRow[]}
        columnDefs={columnDefs}
        getRowId={(params) => params.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={(e: RowClickedEvent<NomineeRow>) => e.data && setViewing(e.data)}
        rowHeight={CLAMPED_ROW_HEIGHT}
        showColumnPicker={false}
        selectionPinned={false}
        massActions={massActions}
      />

      {/* The table can only show a count and a few spellings. Opening a row
          shows every citation and who wrote it, which is what the decision
          to put someone on a ballot actually rests on. */}
      <NomineeDetailSheet
        nominee={viewing}
        nominations={nominations}
        onClose={() => setViewing(null)}
        onAddToBallot={(n) => {
          setViewing(null);
          toBallot([n]);
        }}
        pending={pending}
      />

      {/* Rename inline rather than in a dialog — one field, and the value
          it starts from is already on screen. */}
      {renaming && (
        <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
          <Input
            value={renaming.value}
            onChange={(e) => setRenaming({ ...renaming, value: e.target.value })}
            className="w-[300px]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') setRenaming(null);
              if (e.key === 'Enter' && renaming.value.trim().length >= 2) {
                run(async () => {
                  const res = await renameNominee(renaming.id, renaming.value);
                  if (res.ok) setRenaming(null);
                  return res;
                }, 'Renamed.');
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            disabled={pending || renaming.value.trim().length < 2}
            onClick={() =>
              run(async () => {
                const res = await renameNominee(renaming.id, renaming.value);
                if (res.ok) setRenaming(null);
                return res;
              }, 'Renamed.')
            }
          >
            <Check className="h-3.5 w-3.5" /> Save
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setRenaming(null)}>
            Cancel
          </Button>
        </div>
      )}

      {/* Which name survives is the only question a merge really asks, so
          it is asked outright rather than defaulting to whichever row was
          ticked first. */}
      <NomineePickerDialog
        open={mergingMany !== null}
        onOpenChange={(o) => !o && setMergingMany(null)}
        title={`Merge ${mergingMany?.length ?? 0} people into one`}
        description="Pick the entry to keep. Every nomination under the others moves across and those entries disappear. Reversible — remove an entry again and its nominations return to the ungrouped pile."
        nominees={mergingMany ?? []}
        confirmLabel="Merge"
        pending={pending}
        onPick={(keepId) => {
          const targets = mergingMany ?? [];
          setMergingMany(null);
          startTransition(async () => {
            const res = await mergeManyNominees(
              keepId,
              targets.map((t) => t.id),
            );
            if (res.ok) {
              toast.success(`Merged. ${res.moved ?? 0} nomination(s) moved across.`);
              gridApi?.deselectAll();
              router.refresh();
            } else {
              toast.error(res.message);
            }
          });
        }}
      />

      <ConfirmDialog
        open={merging !== null}
        title={`Merge into “${merging?.leftName ?? ''}”?`}
        description={`All ${merging?.rightCount ?? 0} nomination(s) under “${merging?.rightName ?? ''}” move across and that entry disappears. Reversible — remove the entry again and its nominations return to the ungrouped pile.`}
        confirmLabel="Merge"
        onConfirm={() => {
          const m = merging;
          setMerging(null);
          if (m) run(() => mergeNominees(m.leftId, m.rightId), 'Merged.');
        }}
        onCancel={() => setMerging(null)}
      />

      <ConfirmDialog
        open={dissolving !== null}
        title={`Remove ${dissolving?.length ?? 0} ${dissolving?.length === 1 ? 'person' : 'people'}?`}
        description={`Their nominations return to the ungrouped pile — nothing is deleted. Use this when two people were wrongly merged, or ${awardName} has an entry that is not a real person.`}
        confirmLabel="Remove"
        onConfirm={() => {
          const targets = dissolving;
          setDissolving(null);
          if (!targets) return;
          startTransition(async () => {
            await Promise.all(targets.map((t) => deleteNominee(t.id)));
            toast.success('Removed. Their nominations are back in the ungrouped pile.');
            gridApi?.deselectAll();
            router.refresh();
          });
        }}
        onCancel={() => setDissolving(null)}
      />
    </div>
  );
}
