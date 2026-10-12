'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  ConfirmDialog,
  DataTable,
  EntityTablePanel,
  Switch,
  toast,
  type GridApi,
  type MassActions,
  type RowClickedEvent,
} from '@shesa/ui';

import { archiveBranch, restoreBranch } from '../branch-actions';
import type { BranchInitialValues } from './branch-form';
import { BranchFormDialog } from './branch-form-dialog';
import { buildBranchesColumns } from './branches-columns';
import { buildBranchesConfirmTitle, buildDisplayRows } from './branches-list-helpers';
import type {
  BranchesConfirmState,
  BranchesSerialRow,
  BranchRow,
  ChapterRow,
} from './branches-list-types';

export type { BranchRow, ChapterRow } from './branches-list-types';

interface BranchesListViewProps {
  readonly data: readonly BranchRow[];
  readonly chapters: readonly ChapterRow[];
  readonly canCreate: boolean;
}

/**
 * Branches list with inline chapter disclosure. Each branch row can
 * expand to reveal its chapters underneath (chapter rows are not
 * numbered — the branch's serial stays stable). Archived rows are
 * hidden by default; the "Show archived" toggle opts back in.
 */
export function BranchesListView({ data, chapters, canCreate }: BranchesListViewProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<BranchesSerialRow> | null>(null);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [dialogState, setDialogState] = useState<
    | { readonly mode: 'create' }
    | { readonly mode: 'edit'; readonly initial: BranchInitialValues }
    | null
  >(null);
  const [confirm, setConfirm] = useState<BranchesConfirmState>(null);
  const [, startTransition] = useTransition();

  const visibleBranches = useMemo(
    () => (showArchived ? data : data.filter((b) => b.status !== 'archived')),
    [data, showArchived],
  );
  const visibleChapters = useMemo(
    () => (showArchived ? chapters : chapters.filter((c) => c.status !== 'archived')),
    [chapters, showArchived],
  );

  const chaptersByBranch = useMemo(() => {
    const map = new Map<string, ChapterRow[]>();
    for (const c of visibleChapters) {
      const bucket = map.get(c.parent_id) ?? [];
      bucket.push(c);
      map.set(c.parent_id, bucket);
    }
    return map;
  }, [visibleChapters]);

  const toggleExpanded = useCallback((branchId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(branchId)) next.delete(branchId);
      else next.add(branchId);
      return next;
    });
  }, []);

  const displayed = useMemo(
    () => buildDisplayRows({ branches: visibleBranches, chaptersByBranch, expanded }),
    [visibleBranches, chaptersByBranch, expanded],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return displayed;
    return displayed.filter((r) => {
      if (r.name.toLowerCase().includes(q)) return true;
      if (r.city.toLowerCase().includes(q)) return true;
      if (r.region.toLowerCase().includes(q)) return true;
      if (r.country_code.toLowerCase().includes(q)) return true;
      if (r.nickname?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [displayed, search]);

  const openCreate = () => setDialogState({ mode: 'create' });
  const openEdit = (row: BranchesSerialRow) =>
    setDialogState({
      mode: 'edit',
      initial: {
        scopeId: row.id,
        name: row.name,
        slug: row.slug,
        nickname: row.nickname,
        countryCode: row.country_code,
        region: row.region,
        city: row.city,
        currencyCode: row.currency_code,
      },
    });

  const runMutation = (targets: readonly BranchesSerialRow[], kind: 'archive' | 'restore') => {
    startTransition(async () => {
      const fn = kind === 'archive' ? archiveBranch : restoreBranch;
      const results = await Promise.all(targets.map((t) => fn(t.id)));
      const failed = results.filter((r) => !r.ok);
      const doneVerb = kind === 'archive' ? 'Archived' : 'Restored';
      if (failed.length === 0) {
        toast.success(`${doneVerb} ${targets.length} branch${targets.length === 1 ? '' : 'es'}.`);
      } else if (failed.length === targets.length) {
        toast.error(failed[0]?.message ?? `Could not ${kind}.`);
      } else {
        toast.error(`${doneVerb} ${targets.length - failed.length}; ${failed.length} failed.`);
      }
      router.refresh();
    });
  };

  const columnDefs = useMemo(
    () =>
      buildBranchesColumns({
        expanded,
        onToggle: toggleExpanded,
        onEdit: openEdit,
        onArchive: (r) => setConfirm({ kind: 'archive', targets: [r] }),
        onRestore: (r) => setConfirm({ kind: 'restore', targets: [r] }),
      }),
    [expanded, toggleExpanded],
  );

  const handleRowClicked = (e: RowClickedEvent<BranchesSerialRow>) => {
    if (!e.data) return;
    if (e.data._kind === 'chapter') {
      router.push(`/exco/clusters/branches/${e.data._parent_slug}/chapters/${e.data.slug}`);
      return;
    }
    router.push(`/exco/clusters/branches/${e.data.slug}`);
  };

  const massActions = useMemo<MassActions<BranchesSerialRow>>(
    () => ({
      itemName: 'branch',
      pluralItemName: 'branches',
      onArchive: (selected) => setConfirm({ kind: 'archive', targets: selected }),
    }),
    [],
  );

  const archivedCount =
    data.filter((b) => b.status === 'archived').length +
    chapters.filter((c) => c.status === 'archived').length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'branch' : 'branches'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={canCreate}
        onCreate={openCreate}
        createLabel="Create New Branch"
        filters={
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Switch
              checked={showArchived}
              onCheckedChange={setShowArchived}
              aria-label="Show archived"
            />
            <span>
              Show archived
              {archivedCount > 0 && (
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                  {archivedCount}
                </span>
              )}
            </span>
          </label>
        }
      />

      <DataTable<BranchesSerialRow>
        rowData={filtered as BranchesSerialRow[]}
        columnDefs={columnDefs}
        getRowId={(params) => params.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={handleRowClicked}
        showColumnPicker={false}
        massActions={massActions}
      />

      {dialogState && (
        <BranchFormDialog
          open
          onOpenChange={(o) => {
            if (!o) setDialogState(null);
          }}
          mode={dialogState.mode}
          initial={dialogState.mode === 'edit' ? dialogState.initial : undefined}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title={buildBranchesConfirmTitle(confirm)}
        description={
          confirm?.kind === 'restore'
            ? 'The branch will return to the active list and become available in dropdowns again.'
            : 'Archived branches disappear from every dropdown. Members currently attached keep their reference until an admin reassigns them. Toggle "Show archived" to restore later.'
        }
        confirmLabel={confirm?.kind === 'restore' ? 'Restore' : 'Archive'}
        onConfirm={() => {
          if (!confirm) return;
          const { kind, targets } = confirm;
          setConfirm(null);
          runMutation(targets, kind);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
