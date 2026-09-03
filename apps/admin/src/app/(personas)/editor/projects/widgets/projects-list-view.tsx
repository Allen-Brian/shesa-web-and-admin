'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';

import {
  Button,
  ConfirmDialog,
  DataTable,
  EntityTablePanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  type GridApi,
  type MassActions,
} from '@shesa/ui';

import { deleteProjects } from '../actions/projects';
import { ProjectCategoryManagerDialog } from './project-category-manager-dialog';
import type { CategoryRow, ProjectRow, ProjectStatus } from './project-widget-types';
import { useProjectColumns, type ProjectSerialRow } from './use-project-columns';

interface Props {
  readonly projects: readonly ProjectRow[];
  readonly categories: readonly CategoryRow[];
}

/** Editor's Projects list — same shape as News. */
export function ProjectsListView({ projects, categories }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [gridApi, setGridApi] = useState<GridApi<ProjectSerialRow> | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [confirmMulti, setConfirmMulti] = useState<readonly ProjectSerialRow[]>([]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const flat = useMemo<ProjectSerialRow[]>(() => {
    return projects.map((p, i) => ({
      ...p,
      serial: i + 1,
      categoryLabels: p.categoryIds
        .map((id) => categoryById.get(id)?.name)
        .filter(Boolean)
        .join(', '),
    }));
  }, [projects, categoryById]);

  const filtered = useMemo<ProjectSerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return flat.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.categoryLabels.toLowerCase().includes(q) ||
        !!r.shortDescription?.toLowerCase().includes(q) ||
        !!r.location?.toLowerCase().includes(q)
      );
    });
  }, [flat, search, statusFilter]);

  const runDelete = (rows: readonly { readonly id: string; readonly title: string }[]) => {
    startTransition(async () => {
      const res = await deleteProjects(rows.map((r) => r.id));
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        rows.length === 1 ? `"${rows[0]!.title}" removed.` : `Removed ${rows.length} projects.`,
      );
      setConfirmMulti([]);
      router.refresh();
    });
  };

  const columnDefs = useProjectColumns({
    onOpen: (row) => router.push(`/editor/projects/${row.id}/edit`),
  });

  const massActions = useMemo<MassActions<ProjectSerialRow>>(
    () => ({
      itemName: 'project',
      pluralItemName: 'projects',
      onDelete: (selected) => setConfirmMulti(selected),
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Curate the public Projects page. Featured projects surface at the top; the funding trio
          drives the progress bar wherever it&apos;s set.
        </p>
        <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
          <Layers className="h-4 w-4" />
          Manage categories
        </Button>
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'project' : 'projects'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate
        onCreate={() => router.push('/editor/projects/new')}
        createLabel="New project"
        filters={
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as 'all' | ProjectStatus)}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Ongoing">Ongoing</SelectItem>
              <SelectItem value="Planning">Planning</SelectItem>
              <SelectItem value="Fundraising">Fundraising</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable<ProjectSerialRow>
        rowData={filtered}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable
        pageSize={6}
        rowHeight={90}
        massActions={massActions}
        onRowClicked={(e) => e.data && router.push(`/editor/projects/${e.data.id}/edit`)}
      />

      <ProjectCategoryManagerDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        categories={categories}
      />

      <ConfirmDialog
        open={confirmMulti.length > 0}
        title={`Remove ${confirmMulti.length} project${confirmMulti.length === 1 ? '' : 's'}?`}
        description="They'll all disappear from the public Projects page immediately."
        confirmLabel={pending ? 'Removing…' : 'Remove all'}
        onConfirm={() => runDelete(confirmMulti)}
        onCancel={() => setConfirmMulti([])}
      />
    </div>
  );
}
