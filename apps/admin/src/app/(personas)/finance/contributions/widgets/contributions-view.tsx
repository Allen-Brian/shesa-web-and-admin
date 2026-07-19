'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Target } from 'lucide-react';

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

import { buildContributionColumns } from './contribution-columns';
import { ContributionsDialogs } from './contributions-dialogs';
import { initialCreate, suggestExtendedCloseDate } from './contributions-helpers';
import type {
  ContributionRow,
  CreateForm,
  LifecycleFilter,
  ScopeOption,
  SerialRow,
} from './contributions-types';
import { useContributionsActions } from './use-contributions-actions';

interface ContributionsViewProps {
  readonly contributions: readonly ContributionRow[];
  readonly scopeOptions: readonly ScopeOption[];
}

/**
 * Contributions view — filterable DataTable + four dialogs (create,
 * extend, close-confirm, archive-confirm). Filter state and dialog
 * forms live here; mutation logic lives in
 * `useContributionsActions`; dialog wiring is bundled in
 * `ContributionsDialogs` so this file stays under the 200-line cap.
 * Row-click routes to the charge-detail page — under the hood a
 * contribution IS a charge.
 */
export function ContributionsView({ contributions, scopeOptions }: ContributionsViewProps) {
  const router = useRouter();
  const actions = useContributionsActions({ scopeOptions });
  const { pending } = actions;

  const [search, setSearch] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('all');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(() => initialCreate(scopeOptions));
  const [extendTarget, setExtendTarget] = useState<ContributionRow | null>(null);
  const [extendDate, setExtendDate] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [closingId, setClosingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const filtered = useMemo<readonly SerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return contributions
      .filter((c) => {
        if (lifecycleFilter !== 'all' && c.lifecycle !== lifecycleFilter) return false;
        if (!q) return true;
        if (c.name.toLowerCase().includes(q)) return true;
        if (c.scopeName.toLowerCase().includes(q)) return true;
        if (c.description?.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((c, i) => ({ ...c, serial: i + 1 }));
  }, [contributions, search, lifecycleFilter]);

  const openExtend = (row: ContributionRow) => {
    setExtendTarget(row);
    setExtendDate(suggestExtendedCloseDate(row.closeDate));
    setExtendReason('');
  };
  const closeExtend = () => {
    setExtendTarget(null);
    setExtendDate('');
    setExtendReason('');
  };

  const columnDefs = useMemo(
    () =>
      buildContributionColumns({
        pending,
        onApprove: actions.runApprove,
        onClose: setClosingId,
        onExtend: openExtend,
        onArchive: setArchivingId,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Target className="h-6 w-6" />
          Contributions
        </h1>
        <p className="text-sm text-muted-foreground">
          Goal, open, ticketed, and fixed contributions. Approve to open; close early to stop;
          extend to give more time.
        </p>
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'contribution' : 'contributions'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={scopeOptions.length > 0}
        createLabel="New contribution"
        onCreate={() => {
          setCreateForm(initialCreate(scopeOptions));
          setCreateOpen(true);
        }}
        filters={
          <Select
            value={lifecycleFilter}
            onValueChange={(v) => setLifecycleFilter(v as LifecycleFilter)}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lifecycles</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={(e) => e.data && router.push(`/finance/charges/${e.data.id}`)}
        showColumnPicker={false}
        selectable={false}
      />

      <ContributionsDialogs
        pending={pending}
        scopeOptions={scopeOptions}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        createForm={createForm}
        onCreateFormChange={(patch) => setCreateForm((f) => ({ ...f, ...patch }))}
        onCreateSubmit={() => actions.runCreate(createForm, () => setCreateOpen(false))}
        extendTarget={extendTarget}
        onExtendClose={closeExtend}
        extendDate={extendDate}
        onExtendDateChange={setExtendDate}
        extendReason={extendReason}
        onExtendReasonChange={setExtendReason}
        onExtendSubmit={() => {
          if (!extendTarget) return;
          actions.runExtend(
            extendTarget,
            extendDate,
            extendReason.trim() || undefined,
            closeExtend,
          );
        }}
        closingId={closingId}
        onCloseCancelled={() => setClosingId(null)}
        onCloseConfirmed={() => {
          if (closingId) actions.runClose(closingId);
          setClosingId(null);
        }}
        archivingId={archivingId}
        onArchiveCancelled={() => setArchivingId(null)}
        onArchiveConfirmed={() => {
          if (archivingId) actions.runArchive(archivingId);
          setArchivingId(null);
        }}
      />
    </div>
  );
}
