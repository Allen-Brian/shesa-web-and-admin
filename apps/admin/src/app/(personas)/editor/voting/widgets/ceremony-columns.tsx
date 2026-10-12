'use client';

import Link from 'next/link';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  type ColDef,
  type ICellRendererParams,
} from '@shesa/ui';
import {
  BarChart3,
  Globe,
  MoreHorizontal,
  Pencil,
  PowerOff,
  ScrollText,
  Trash2,
  Trophy,
} from 'lucide-react';

import type { EditionSummary } from '../load-voting';
import { watDate } from '../wat';

import { serialColumn } from './clamped-cell';
import { PHASE_COPY } from './phase-badge';

interface Handlers {
  readonly onEdit: (row: EditionSummary) => void;
  readonly onDelete: (row: EditionSummary) => void;
  readonly onToggleActive: (row: EditionSummary) => void;
}

/**
 * The ceremony table.
 *
 * Ordered by what a reader checks first: is it live, what is it called, where
 * is it in its cycle, then the volumes. The count columns start hidden
 * beyond the essentials — nineteen awards and four numbers on one row is a
 * table nobody reads — and the Columns picker brings the rest back.
 */
export function buildCeremonyColumns({
  onEdit,
  onDelete,
  onToggleActive,
}: Handlers): ColDef<EditionSummary>[] {
  return [
    serialColumn<EditionSummary>(),
    {
      headerName: 'Live',
      colId: 'live',
      field: 'isActive',
      width: 96,
      maxWidth: 96,
      filter: false,
      suppressMovable: true,
      cellRenderer: (p: ICellRendererParams<EditionSummary>) =>
        p.data?.isActive ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Globe className="h-3.5 w-3.5" aria-hidden />
            Live
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      headerName: 'Ceremony',
      field: 'name',
      flex: 2,
      minWidth: 240,
      cellRenderer: (p: ICellRendererParams<EditionSummary>) => {
        if (!p.data) return null;
        return (
          <span className="flex h-full flex-col justify-center leading-tight">
            <Link
              href={`/editor/voting/${p.data.slug}`}
              className="font-medium text-foreground hover:text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {p.data.name}
            </Link>
            <span className="text-xs text-muted-foreground">{p.data.slug}</span>
          </span>
        );
      },
    },
    {
      headerName: 'Phase',
      field: 'phase',
      width: 150,
      cellRenderer: (p: ICellRendererParams<EditionSummary>) => {
        if (!p.data) return null;
        const copy = PHASE_COPY[p.data.phase];
        return <Badge className={copy.tone}>{copy.label}</Badge>;
      },
    },
    {
      headerName: 'Weighting',
      colId: 'mode',
      field: 'votingMode',
      width: 150,
      cellRenderer: (p: ICellRendererParams<EditionSummary>) => {
        if (!p.data) return null;
        return p.data.votingMode === 'public_only' ? (
          <span className="text-xs text-muted-foreground">Public only</span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {Math.round(p.data.exStudentWeight * 100)} / {Math.round(p.data.excoWeight * 100)}
          </span>
        );
      },
    },
    {
      headerName: 'Nominations',
      colId: 'nomination_window',
      flex: 1,
      minWidth: 190,
      sortable: false,
      valueGetter: (p) =>
        p.data
          ? `${watDate(p.data.nominationsOpenAt, false)} → ${watDate(p.data.nominationsCloseAt, false)}`
          : '',
      cellClass: 'text-xs text-muted-foreground',
    },
    {
      headerName: 'Voting',
      colId: 'voting_window',
      flex: 1,
      minWidth: 190,
      sortable: false,
      valueGetter: (p) =>
        p.data
          ? `${watDate(p.data.votingOpenAt, false)} → ${watDate(p.data.votingCloseAt, false)}`
          : '',
      cellClass: 'text-xs text-muted-foreground',
    },
    {
      headerName: 'Awards',
      field: 'awardCount',
      width: 110,
      type: 'numericColumn',
    },
    {
      headerName: 'Nominations in',
      colId: 'nominations_in',
      field: 'nominationCount',
      width: 150,
      type: 'numericColumn',
    },
    {
      headerName: 'Awaiting review',
      colId: 'pending',
      field: 'pendingCount',
      width: 150,
      type: 'numericColumn',
      initialHide: true,
      cellRenderer: (p: ICellRendererParams<EditionSummary, number>) =>
        (p.value ?? 0) > 0 ? (
          <span className="font-medium text-amber-600 dark:text-amber-400">{p.value}</span>
        ) : (
          <span className="text-muted-foreground">0</span>
        ),
    },
    {
      headerName: 'On the ballot',
      colId: 'candidates',
      field: 'candidateCount',
      width: 140,
      type: 'numericColumn',
      initialHide: true,
    },
    {
      // The number that is a problem rather than a fact: an award with
      // nobody shortlisted is dropped from the public ballot entirely.
      headerName: 'Awards with nobody',
      colId: 'empty_awards',
      field: 'emptyAwardCount',
      width: 180,
      type: 'numericColumn',
      initialHide: true,
      cellRenderer: (p: ICellRendererParams<EditionSummary, number>) =>
        (p.value ?? 0) > 0 ? (
          <span className="font-medium text-destructive">{p.value}</span>
        ) : (
          <span className="text-muted-foreground">0</span>
        ),
    },
    {
      headerName: 'Ballots cast',
      colId: 'ballots',
      field: 'ballotCount',
      width: 140,
      type: 'numericColumn',
    },
    {
      headerName: '',
      colId: 'actions',
      width: 64,
      maxWidth: 64,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellRenderer: (p: ICellRendererParams<EditionSummary>) =>
        p.data ? (
          <CeremonyRowActions
            row={p.data}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleActive={onToggleActive}
          />
        ) : null,
    },
  ];
}

function CeremonyRowActions({
  row,
  onEdit,
  onDelete,
  onToggleActive,
}: { readonly row: EditionSummary } & Handlers) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-md p-0"
          aria-label="Ceremony actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => onEdit(row)}>
          <Pencil className="h-4 w-4" />
          Edit ceremony
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onToggleActive(row)}>
          {row.isActive ? (
            <>
              <PowerOff className="h-4 w-4" />
              Take off the website
            </>
          ) : (
            <>
              <Globe className="h-4 w-4" />
              Make it live
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={`/editor/voting/${row.slug}?tab=awards`}>
            <Trophy className="h-4 w-4" />
            Awards
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/editor/voting/${row.slug}/ballots`}>
            <ScrollText className="h-4 w-4" />
            Ballots
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/editor/voting/${row.slug}/results`}>
            <BarChart3 className="h-4 w-4" />
            Results
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(row)}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
