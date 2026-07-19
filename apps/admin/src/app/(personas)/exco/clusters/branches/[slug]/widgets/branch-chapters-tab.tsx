'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

import {
  Button,
  ConfirmDialog,
  DataTable,
  EntityTablePanel,
  Switch,
  toast,
  type GridApi,
  type MassActions,
  type RowClickedEvent,
} from '@shesa/ui';

import { archiveChapter, restoreChapter } from '../../chapter-actions';
import type { ChapterInitialValues } from '../../widgets/chapter-form';
import { ChapterFormDialog } from '../../widgets/chapter-form-dialog';
import { buildBranchChapterColumns } from './branch-chapter-columns';
import type {
  BranchChapterRow,
  BranchGeography,
  ChapterConfirm,
  ChapterSerialRow,
} from './branch-detail-types';

interface BranchChaptersTabProps {
  readonly branchId: string;
  readonly branchSlug: string;
  readonly branchName: string;
  readonly branchGeography: BranchGeography;
  readonly chapters: readonly BranchChapterRow[];
  readonly canCreate: boolean;
  readonly onOpenNew: () => void;
}

function buildChapterConfirmTitle(c: ChapterConfirm): string {
  if (!c) return '';
  const verb = c.kind === 'restore' ? 'Restore' : 'Archive';
  if (c.targets.length === 1) return `${verb} ${c.targets[0]?.name ?? 'this chapter'}?`;
  return `${verb} ${c.targets.length} chapters?`;
}

/**
 * Chapters tab on the Branch detail page. Toggle "Show archived" moves
 * archived chapters in/out of the visible set; row click deep-links into
 * the chapter detail page. Row + bulk mutations run through the
 * chapter-actions Server Actions and refresh the router afterwards.
 */
export function BranchChaptersTab({
  branchId,
  branchSlug,
  branchName,
  branchGeography,
  chapters,
  canCreate,
  onOpenNew,
}: BranchChaptersTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [gridApi, setGridApi] = useState<GridApi<ChapterSerialRow> | null>(null);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editChapter, setEditChapter] = useState<ChapterInitialValues | null>(null);
  const [confirm, setConfirm] = useState<ChapterConfirm>(null);

  const visibleChapters = useMemo(
    () => (showArchived ? chapters : chapters.filter((c) => c.status !== 'archived')),
    [chapters, showArchived],
  );
  const archivedCount = chapters.length - chapters.filter((c) => c.status !== 'archived').length;

  const numbered = useMemo<readonly ChapterSerialRow[]>(
    () => visibleChapters.map((c, i) => ({ ...c, serial: i + 1 })),
    [visibleChapters],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return numbered;
    return numbered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q),
    );
  }, [numbered, search]);

  const openEdit = (row: ChapterSerialRow) =>
    setEditChapter({
      scopeId: row.id,
      parentBranchId: branchId,
      parentBranchName: branchName,
      chapterKind: row.chapter_kind,
      name: row.name,
      slug: row.slug,
      nickname: null,
      description: null,
      countryCode: branchGeography.countryCode,
      region: row.region,
      city: row.city,
      currencyCode: branchGeography.currencyCode,
      registrationFeeRequired: false,
      registrationFeeAmount: null,
      registrationFeeCurrency: null,
      contactEmail: row.contact_email,
      contactPhone: null,
    });

  const runMutation = (targets: readonly ChapterSerialRow[], kind: 'archive' | 'restore') => {
    startTransition(async () => {
      const fn = kind === 'archive' ? archiveChapter : restoreChapter;
      const results = await Promise.all(targets.map((t) => fn(t.id)));
      const failed = results.filter((r) => !r.ok);
      const doneVerb = kind === 'archive' ? 'Archived' : 'Restored';
      if (failed.length === 0) {
        toast.success(`${doneVerb} ${targets.length} chapter${targets.length === 1 ? '' : 's'}.`);
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
      buildBranchChapterColumns({
        onEdit: openEdit,
        onArchive: (r) => setConfirm({ kind: 'archive', targets: [r] }),
        onRestore: (r) => setConfirm({ kind: 'restore', targets: [r] }),
      }),
    [],
  );

  const handleRowClicked = (e: RowClickedEvent<ChapterSerialRow>) => {
    if (!e.data) return;
    router.push(`/exco/clusters/branches/${branchSlug}/chapters/${e.data.slug}`);
  };

  const massActions = useMemo<MassActions<ChapterSerialRow>>(
    () => ({
      itemName: 'chapter',
      pluralItemName: 'chapters',
      onArchive: (selected) => setConfirm({ kind: 'archive', targets: selected }),
    }),
    [],
  );

  return (
    <>
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'chapter' : 'chapters'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={canCreate}
        createLabel="New Chapter"
        onCreate={onOpenNew}
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
      {visibleChapters.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <p>
            {chapters.length === 0
              ? `No chapters yet under ${branchName}.`
              : 'No live chapters. Toggle "Show archived" to see retired ones.'}
          </p>
          {canCreate && chapters.length === 0 && (
            <Button asChild size="sm" variant="outline">
              <button type="button" onClick={onOpenNew}>
                <Plus className="h-4 w-4" />
                Add the first chapter
              </button>
            </Button>
          )}
        </div>
      ) : (
        <DataTable<ChapterSerialRow>
          rowData={filtered as ChapterSerialRow[]}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          onGridReady={(e) => setGridApi(e.api)}
          onRowClicked={handleRowClicked}
          showColumnPicker={false}
          massActions={massActions}
        />
      )}

      {editChapter && (
        <ChapterFormDialog
          open
          onOpenChange={(o) => {
            if (!o) setEditChapter(null);
          }}
          mode="edit"
          initial={editChapter}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title={buildChapterConfirmTitle(confirm)}
        description={
          confirm?.kind === 'restore'
            ? 'The chapter will return to the active list and become available in dropdowns again.'
            : 'Archived chapters disappear from every dropdown. Existing memberships keep resolving. Toggle "Show archived" to restore later.'
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
    </>
  );
}
