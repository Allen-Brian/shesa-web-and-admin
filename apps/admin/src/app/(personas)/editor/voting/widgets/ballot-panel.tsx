'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Badge,
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
import { AlertTriangle, Pencil, UserRound } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

import { removeCandidates, type CandidateInput } from '../actions/voting-actions';
import type { AwardsPhase, CandidateRow } from '../voting-types';

import { BLANK_CANDIDATE, CandidateDialog } from './candidate-dialog';
import { CLAMPED_ROW_HEIGHT, ClampedCell, serialColumn } from './clamped-cell';

/** What the briefing asks the Exco to supply before a name goes to a vote. */
function missingFrom(c: CandidateRow): string[] {
  const gaps: string[] = [];
  if (!c.accomplishments?.trim()) gaps.push('works');
  if (!c.profession?.trim()) gaps.push('profession');
  if (!c.photoUrl) gaps.push('photo');
  return gaps;
}

/**
 * One award's ballot — exactly what voters will see under it.
 *
 * Most rows arrive from the Nominees tab already carrying the members' own
 * citations, which makes them a draft rather than a publication. The
 * Incomplete column is the difference: the briefing asks for a profession,
 * a photograph and a written paragraph, and a row missing those is a name on
 * a ballot with nothing to vote on.
 */
export function BallotPanel({
  awardId,
  awardName,
  candidates,
  phase,
}: {
  readonly awardId: string;
  readonly awardName: string;
  readonly candidates: readonly CandidateRow[];
  readonly phase: AwardsPhase;
}) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<CandidateRow> | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ id: string | null; input: CandidateInput } | null>(null);
  const [confirm, setConfirm] = useState<readonly CandidateRow[] | null>(null);
  const [pending, startTransition] = useTransition();

  const votingStarted = phase === 'voting' || phase === 'closed';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.profession ?? '').toLowerCase().includes(q) ||
        (c.accomplishments ?? '').toLowerCase().includes(q),
    );
  }, [candidates, search]);

  const incomplete = candidates.filter(
    (c) => c.status === 'active' && missingFrom(c).length > 0,
  ).length;

  const openEdit = (c: CandidateRow) =>
    setEditing({
      id: c.id,
      input: {
        awardId: c.awardId,
        nomineeId: c.nomineeId,
        fullName: c.fullName,
        batchYear: c.batchYear,
        branchLabel: c.branchLabel,
        profession: c.profession,
        accomplishments: c.accomplishments,
        photoUrl: c.photoUrl,
        sortOrder: c.sortOrder,
        status: c.status,
      },
    });

  const columnDefs = useMemo<ColDef<CandidateRow>[]>(
    () => [
      serialColumn<CandidateRow>(),
      {
        headerName: '',
        colId: 'photo',
        width: 64,
        maxWidth: 64,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<CandidateRow>) => (
          <span className="flex h-full items-center">
            <span className="relative block h-9 w-9 overflow-hidden rounded-md bg-muted">
              {p.data?.photoUrl ? (
                <Image
                  src={p.data.photoUrl}
                  alt=""
                  fill
                  sizes="36px"
                  className="object-cover object-top"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-muted-foreground">
                  <UserRound className="h-4 w-4" aria-hidden />
                </span>
              )}
            </span>
          </span>
        ),
      },
      {
        headerName: 'Candidate',
        field: 'fullName',
        flex: 1,
        minWidth: 190,
        cellRenderer: (p: ICellRendererParams<CandidateRow>) => {
          if (!p.data) return null;
          return (
            <span className="flex h-full flex-col justify-center leading-tight">
              <span className="font-medium text-foreground">{p.data.fullName}</span>
              <span className="text-xs text-muted-foreground">
                {[p.data.batchYear, p.data.branchLabel].filter(Boolean).join(' · ') || '—'}
              </span>
            </span>
          );
        },
      },
      {
        headerName: 'Profession',
        field: 'profession',
        flex: 1,
        minWidth: 160,
        valueFormatter: (p) => p.value ?? '—',
        cellClass: 'text-xs text-muted-foreground',
      },
      {
        headerName: 'Works accomplished',
        field: 'accomplishments',
        flex: 2,
        minWidth: 260,
        sortable: false,
        cellRenderer: (p: ICellRendererParams<CandidateRow, string>) => (
          <ClampedCell text={p.value} />
        ),
      },
      {
        headerName: 'Incomplete',
        colId: 'gaps',
        width: 190,
        sortable: false,
        cellRenderer: (p: ICellRendererParams<CandidateRow>) => {
          if (!p.data) return null;
          if (p.data.status === 'withdrawn') {
            return <Badge className="bg-muted text-muted-foreground">Withdrawn</Badge>;
          }
          const gaps = missingFrom(p.data);
          if (gaps.length === 0) {
            return <span className="text-xs text-muted-foreground">Ready</span>;
          }
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              {gaps.join(', ')}
            </span>
          );
        },
      },
      {
        headerName: '',
        colId: 'actions',
        width: 64,
        maxWidth: 64,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<CandidateRow>) =>
          p.data ? (
            <span className="flex h-full items-center justify-end">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="Edit candidate"
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(p.data as CandidateRow);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </span>
          ) : null,
      },
    ],
    [],
  );

  const massActions = useMemo<MassActions<CandidateRow>>(
    () => ({
      itemName: 'candidate',
      onDelete: (selected) => setConfirm(selected),
    }),
    [],
  );

  const onRowClicked = (e: RowClickedEvent<CandidateRow>) => {
    if (e.data) openEdit(e.data);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'candidate' : 'candidates'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate
        createLabel="Add candidate"
        onCreate={() => setEditing({ id: null, input: { ...BLANK_CANDIDATE, awardId } })}
      />

      {candidates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm font-medium text-foreground">Nobody on the ballot yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            An award with no candidates is not shown to voters at all. Pick people on the Nominees
            tab and add them here, or add a name by hand.
          </p>
        </div>
      ) : (
        <>
          {incomplete > 0 && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
              <strong className="text-foreground">
                {incomplete} candidate{incomplete === 1 ? '' : 's'} still incomplete.
              </strong>{' '}
              Voters read the works accomplished and see the photograph — a row without them is a
              name with nothing to vote on.
            </p>
          )}

          <DataTable<CandidateRow>
            rowData={filtered as CandidateRow[]}
            columnDefs={columnDefs}
            getRowId={(params) => params.data.id}
            onGridReady={(e) => setGridApi(e.api)}
            onRowClicked={onRowClicked}
            rowHeight={CLAMPED_ROW_HEIGHT}
            showColumnPicker={false}
            selectionPinned={false}
            massActions={massActions}
          />
        </>
      )}

      {editing && (
        <CandidateDialog
          open
          onOpenChange={(o) => !o && setEditing(null)}
          candidateId={editing.id}
          input={editing.input}
          onInput={(input) => setEditing({ ...editing, input })}
          awardName={awardName}
        />
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={`Remove ${confirm?.length ?? 0} candidate${confirm?.length === 1 ? '' : 's'}?`}
        description={
          votingStarted
            ? 'Voting has started, so they are marked withdrawn rather than deleted. Votes already cast for them stay on the record and stay in the tally.'
            : 'They are deleted outright. Nothing has been voted on yet, so nothing is lost.'
        }
        confirmLabel="Remove"
        onConfirm={() => {
          const targets = confirm;
          setConfirm(null);
          if (!targets) return;
          startTransition(async () => {
            const res = await removeCandidates(
              targets.map((t) => t.id),
              votingStarted,
            );
            if (res.ok) {
              toast.success('Removed from the ballot.');
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
