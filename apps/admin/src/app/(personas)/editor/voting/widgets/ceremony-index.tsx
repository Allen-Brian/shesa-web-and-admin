'use client';

import { useRouter } from 'next/navigation';
import {
  Button,
  ConfirmDialog,
  DataTable,
  EntityTablePanel,
  toast,
  type GridApi,
  type MassActions,
  type RowClickedEvent,
} from '@shesa/ui';
import { Globe, Plus, Trophy } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

import { deleteCeremony, setActiveCeremony } from '../actions/voting-actions';
import type { EditionSummary } from '../load-voting';

import { buildCeremonyColumns } from './ceremony-columns';
import { CeremonyFormDialog, type CeremonyDialogState } from './ceremony-form-dialog';

/**
 * Every ceremony, in the same table every other list in this dashboard uses.
 *
 * Rows rather than cards: the useful comparison between two cycles is their
 * dates and their counts side by side, and cards put those on separate lines
 * at different heights. Clicking a row opens the ceremony; the kebab does
 * everything that is not "open it".
 */
export function CeremonyIndex({ editions }: { readonly editions: readonly EditionSummary[] }) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<EditionSummary> | null>(null);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<CeremonyDialogState | null>(null);
  const [confirm, setConfirm] = useState<readonly EditionSummary[] | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return editions;
    return editions.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.slug.toLowerCase().includes(q) ||
        e.phase.toLowerCase().includes(q),
    );
  }, [editions, search]);

  const toggleActive = (row: EditionSummary) =>
    startTransition(async () => {
      const res = await setActiveCeremony(row.isActive ? null : row.id);
      if (res.ok) {
        toast.success(
          row.isActive
            ? 'Stood down. The awards page has nothing to show until a ceremony is made live.'
            : `"${row.name}" is now the ceremony the website shows.`,
        );
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });

  /**
   * Deletion, one row or many.
   *
   * Each is refused server-side when it holds cast ballots, so a mixed
   * selection deletes what it can and names what it kept — a blanket refusal
   * would leave the caller to find the offending row themselves.
   */
  const runDelete = (targets: readonly EditionSummary[]) =>
    startTransition(async () => {
      const results = await Promise.all(targets.map((t) => deleteCeremony(t.id)));
      const failed = results
        .map((r, i) => ({ r, name: targets[i]?.name ?? '' }))
        .filter((x) => !x.r.ok);

      if (failed.length === 0) {
        toast.success(
          `Deleted ${targets.length} ${targets.length === 1 ? 'ceremony' : 'ceremonies'}.`,
        );
      } else if (failed.length === targets.length) {
        const first = failed[0]?.r;
        toast.error(first && !first.ok ? first.message : 'Could not delete.');
      } else {
        toast.error(
          `Deleted ${targets.length - failed.length}. Kept ${failed
            .map((f) => f.name)
            .join(', ')} — they hold cast ballots.`,
        );
      }
      gridApi?.deselectAll();
      router.refresh();
    });

  const columnDefs = useMemo(
    () =>
      buildCeremonyColumns({
        onEdit: (row) => setDialog({ mode: 'edit', edition: row }),
        onDelete: (row) => setConfirm([row]),
        onToggleActive: toggleActive,
      }),
    // Built once: the handlers only ever call setState and a transition,
    // neither of which changes identity in a way the grid cares about.
    [],
  );

  const massActions = useMemo<MassActions<EditionSummary>>(
    () => ({
      itemName: 'ceremony',
      pluralItemName: 'ceremonies',
      onDelete: (selected) => setConfirm(selected),
      custom: [
        {
          label: 'Make live',
          icon: <Globe className="h-4 w-4" />,
          // Live is a single slot, so a multi-row selection cannot all win.
          // The first is taken and the caller told which.
          onClick: (selected: EditionSummary[]) => {
            const first = selected[0];
            if (!first) return;
            if (selected.length > 1) {
              toast.message(`Only one ceremony can be live — using “${first.name}”.`);
            }
            if (!first.isActive) toggleActive(first);
          },
        },
      ],
    }),
    [],
  );

  const onRowClicked = (e: RowClickedEvent<EditionSummary>) => {
    if (!e.data) return;
    router.push(`/editor/voting/${e.data.slug}`);
  };

  const formDialog = (
    // Keyed so switching rows remounts with that ceremony's values rather
    // than carrying the previous one's across.
    <CeremonyFormDialog
      key={dialog?.mode === 'edit' ? dialog.edition.id : 'create'}
      state={dialog}
      onOpenChange={(o) => !o && setDialog(null)}
      onCreated={(slug) => router.push(`/editor/voting/${slug}`)}
    />
  );

  if (editions.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <Trophy className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">Start an awards ceremony</p>
          <p className="max-w-md text-sm text-muted-foreground">
            A ceremony holds its own categories, awards and dates. Create it, add the awards, then
            open nominations.
          </p>
          <Button type="button" onClick={() => setDialog({ mode: 'create' })}>
            <Plus className="h-3.5 w-3.5" /> New ceremony
          </Button>
        </div>
        {formDialog}
      </>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'ceremony' : 'ceremonies'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate
        createLabel="New ceremony"
        onCreate={() => setDialog({ mode: 'create' })}
      />

      <DataTable<EditionSummary>
        rowData={filtered as EditionSummary[]}
        columnDefs={columnDefs}
        getRowId={(params) => params.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={onRowClicked}
        showColumnPicker={false}
        selectionPinned={false}
        massActions={massActions}
      />

      {formDialog}

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm && confirm.length === 1
            ? `Delete “${confirm[0]?.name ?? ''}”?`
            : `Delete ${confirm?.length ?? 0} ceremonies?`
        }
        description="Their awards, categories and nominations go with them, and this cannot be undone. Any ceremony that already holds cast ballots is refused and left alone."
        confirmLabel="Delete"
        onConfirm={() => {
          const targets = confirm;
          setConfirm(null);
          if (targets) runDelete(targets);
        }}
        onCancel={() => setConfirm(null)}
      />

      {pending && <span className="sr-only">Working…</span>}
    </div>
  );
}
