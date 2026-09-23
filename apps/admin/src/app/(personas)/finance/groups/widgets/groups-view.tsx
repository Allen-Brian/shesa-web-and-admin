'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock } from 'lucide-react';

import {
  DataTable,
  EntityTablePanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type GridApi,
} from '@shesa/ui';

import { ExportButton } from '@/components/export-button';
import { activeFilters } from '@/lib/export/filters';

import { buildGroupsExport } from './groups-export';
import { buildGroupColumns } from './group-columns';
import { CreateGroupDialog } from './create-group-dialog';
import { initialCreateGroup } from './groups-helpers';
import type { CreateGroupForm, GroupRow, SerialGroupRow, StatusFilter } from './groups-types';
import { useGroupsActions } from './use-groups-actions';

interface GroupsViewProps {
  readonly groups: readonly GroupRow[];
}

/**
 * Event Groups admin view — filterable DataTable + create dialog +
 * row action cluster. Row-click routes to the per-group shell. Only
 * mainstream users can reach this page (RLS on finance.groups filters
 * everyone else out); the groups list is empty for anyone who lands
 * here without mainstream reach.
 */
export function GroupsView({ groups }: GroupsViewProps) {
  const router = useRouter();
  const actions = useGroupsActions();
  const { pending } = actions;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [gridApi, setGridApi] = useState<GridApi<SerialGroupRow> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateGroupForm>(() => initialCreateGroup());

  const filtered = useMemo<readonly SerialGroupRow[]>(() => {
    const q = search.trim().toLowerCase();
    return groups
      .filter((g) => {
        if (statusFilter !== 'all' && g.status !== statusFilter) return false;
        if (!q) return true;
        if (g.name.toLowerCase().includes(q)) return true;
        if (g.slug.toLowerCase().includes(q)) return true;
        if (g.description?.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((g, i) => ({ ...g, serial: i + 1 }));
  }, [groups, search, statusFilter]);

  const columnDefs = useMemo(
    () =>
      buildGroupColumns({
        pending,
        onSetStatus: actions.runSetStatus,
        onToggleSidebar: actions.runToggleSidebar,
      }),
    [pending],
  );

  const openCreate = () => {
    setCreateForm(initialCreateGroup());
    setCreateOpen(true);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <CalendarClock className="h-6 w-6" />
          Event Groups
        </h1>
        <p className="text-sm text-muted-foreground">
          Groups gather every charge, donation, and expense for one event without silo-ing the data
          — every row still shows in the mainstream ledger.
        </p>
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'group' : 'groups'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={true}
        createLabel="New group"
        onCreate={openCreate}
        actions={
          <ExportButton
            spec={() =>
              buildGroupsExport(
                filtered,
                activeFilters({ Search: search.trim(), Status: statusFilter }),
              )
            }
            disabled={filtered.length === 0}
          />
        }
        filters={
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable<SerialGroupRow>
        rowData={filtered as SerialGroupRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={(e) => e.data && router.push(`/finance/groups/${e.data.slug}`)}
        showColumnPicker={false}
        selectable={false}
      />

      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        form={createForm}
        onFormChange={(patch) => setCreateForm((f) => ({ ...f, ...patch }))}
        onSubmit={() => actions.runCreate(createForm, () => setCreateOpen(false))}
        pending={pending}
      />
    </div>
  );
}
