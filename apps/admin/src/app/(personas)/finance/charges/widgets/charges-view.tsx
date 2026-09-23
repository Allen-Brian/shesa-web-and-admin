'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard } from 'lucide-react';

import {
  ConfirmDialog,
  DataTable,
  EntityTablePanel,
  toast,
  type GridApi,
  type MassActions,
} from '@shesa/ui';

import { ExportButton } from '@/components/export-button';
import { FilterChips } from '@/components/filters/filter-chips';
import { FilterDropdown } from '@/components/filters/filter-dropdown';
import { activeFilters, filterValuesToMeta } from '@/lib/export/filters';
import { useFilterState } from '@/lib/filters/use-filter-state';

import { buildChargesExport } from './charges-export';
import { buildChargeColumns } from './charge-columns';
import { CreateChargeDialog } from './create-charge-dialog';
import { ChargesKpiStrip } from './charges-kpi-strip';
import {
  CHARGES_FILTER_CONFIG,
  CHARGES_FILTER_DIMENSIONS,
  type ChargesFilterDim,
} from './charges-filter-config';
import { buildChargeKpis } from './charges-kpis';
import { initialCreate, toEditForm } from './charges-helpers';
import type {
  ChargeRow,
  CreateForm,
  EditForm,
  ScopeOption,
  SerialRow,
  TargetScopeOption,
} from './charges-types';
import { EditChargeDialog } from './edit-charge-dialog';
import { useChargesActions } from './use-charges-actions';

interface ChargesViewProps {
  readonly charges: readonly ChargeRow[];
  readonly scopeOptions: readonly ScopeOption[];
  readonly targetScopeOptions: readonly TargetScopeOption[];
  /**
   * Owner scope preselected for Individual charges — the operator's
   * active finance scope (mainstream for a global finance user, own
   * branch otherwise). Set server-side; the form never asks.
   */
  readonly defaultIndividualScopeId: string;
  /**
   * Owner scope preselected for Group charges — always the mainstream
   * scope, since a Group charge only makes sense at the top of the
   * tree.
   */
  readonly mainstreamScopeId: string;
  /**
   * The charge kind this operator may create — fixed, never chosen.
   * Mainstream Finance → 'group' (levies on bodies); a branch/chapter
   * Finance → 'individual' (its own members).
   */
  readonly chargeKind: 'group' | 'individual';
}

/**
 * Charges portfolio — KPI strip + URL-backed FilterDropdown + chips +
 * DataTable + create/edit/archive/delete dialogs. Row-click routes to
 * the charge-detail drill-down; every rendered chunk delegates to a
 * sibling widget so this file stays under the 200-line cap.
 */
export function ChargesView({
  charges,
  scopeOptions,
  targetScopeOptions,
  defaultIndividualScopeId,
  mainstreamScopeId,
  chargeKind,
}: ChargesViewProps) {
  const router = useRouter();
  const actions = useChargesActions({ scopeOptions });
  const { pending } = actions;

  // The kind is fixed by the operator's role — a Mainstream user only
  // ever bills bodies, a branch/chapter user only ever bills members.
  const createPartyType = chargeKind === 'group' ? 'branch' : 'member';
  const createScopeId = chargeKind === 'group' ? mainstreamScopeId : defaultIndividualScopeId;

  const filterState = useFilterState<ChargesFilterDim>(CHARGES_FILTER_DIMENSIONS);

  const [search, setSearch] = useState('');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(() =>
    initialCreate(createScopeId, createPartyType),
  );
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [publishing, setPublishing] = useState<ChargeRow | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ChargeRow | null>(null);
  const [bulkArchiving, setBulkArchiving] = useState<readonly string[] | null>(null);

  const kpis = useMemo(() => buildChargeKpis(charges), [charges]);

  const filtered = useMemo<readonly SerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    const typeSel = filterState.values.type as readonly string[] | undefined;
    const shapeSel = filterState.values.shape as readonly string[] | undefined;
    const statusSel = filterState.values.status as readonly string[] | undefined;
    return charges
      .filter((c) => {
        if (typeSel?.length && !typeSel.includes(c.targetPartyType)) return false;
        if (shapeSel?.length && !shapeSel.includes(c.shape)) return false;
        if (statusSel?.length && !statusSel.includes(c.status)) return false;
        if (!q) return true;
        if (c.name.toLowerCase().includes(q)) return true;
        if (c.scopeName.toLowerCase().includes(q)) return true;
        if (c.description?.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((c, i) => ({ ...c, serial: i + 1 }));
  }, [charges, search, filterState.values]);

  const columnDefs = useMemo(
    () =>
      buildChargeColumns({
        pending,
        onEdit: (row) => setEditing(toEditForm(row)),
        onPublish: setPublishing,
        onArchive: setArchivingId,
        onDelete: setDeleting,
      }),
    [pending],
  );

  // Selection-bar bulk actions. Archive routes through a confirm (it
  // stops generation); the status flips are non-destructive and apply
  // immediately, each filtered to rows in a valid source state so a
  // mixed selection only touches the ones the transition is legal for.
  const massActions = useMemo<MassActions<SerialRow>>(
    () => ({
      itemName: 'charge',
      pluralItemName: 'charges',
      onArchive: (selected) => {
        const ids = selected.filter((r) => r.status !== 'archived').map((r) => r.id);
        if (ids.length === 0) return toast.info('Every selected charge is already archived.');
        setBulkArchiving(ids);
      },
      custom: [
        {
          label: 'Publish (activate drafts)',
          onClick: (selected) => {
            const ids = selected.filter((r) => r.status === 'draft').map((r) => r.id);
            if (ids.length === 0) return toast.info('No selected charge is a draft.');
            actions.runBulkStatus(ids, 'active', () => gridApi?.deselectAll());
          },
        },
        {
          label: 'Pause active',
          onClick: (selected) => {
            const ids = selected.filter((r) => r.status === 'active').map((r) => r.id);
            if (ids.length === 0) return toast.info('No selected charge is active.');
            actions.runBulkStatus(ids, 'paused', () => gridApi?.deselectAll());
          },
        },
        {
          label: 'Resume paused',
          onClick: (selected) => {
            const ids = selected.filter((r) => r.status === 'paused').map((r) => r.id);
            if (ids.length === 0) return toast.info('No selected charge is paused.');
            actions.runBulkStatus(ids, 'active', () => gridApi?.deselectAll());
          },
        },
      ],
    }),
    [actions, gridApi],
  );

  const openCreate = () => {
    setCreateForm(initialCreate(createScopeId, createPartyType));
    setCreateOpen(true);
  };

  // The charge kind + owner scope are fixed at open time, so a form
  // change is just a shallow merge — the operator can never flip Type.
  const handleFormChange = (patch: Partial<CreateForm>) => {
    setCreateForm((f) => ({ ...f, ...patch }));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <CreditCard className="h-6 w-6" />
          Charges
        </h1>
        <p className="text-sm text-muted-foreground">
          {chargeKind === 'group'
            ? 'Levies on branches, chapters, and batches — each owes as a body, with a per-target amount.'
            : 'Dues for your members. Add rules so different members pay different amounts.'}
        </p>
      </div>

      <ChargesKpiStrip kpis={kpis} />

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'charge' : 'charges'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={scopeOptions.length > 0}
        createLabel="New charge"
        onCreate={openCreate}
        actions={
          <ExportButton
            spec={() =>
              buildChargesExport(filtered, [
                ...activeFilters({ Search: search.trim() }),
                ...filterValuesToMeta(filterState.values),
              ])
            }
            disabled={filtered.length === 0}
          />
        }
        filters={
          <FilterDropdown
            dimensions={CHARGES_FILTER_CONFIG}
            values={filterState.values}
            onApply={filterState.setValues}
            onClearAll={filterState.clearAll}
            activeCount={filterState.activeCount}
          />
        }
      />

      <FilterChips
        values={filterState.values}
        dimensions={CHARGES_FILTER_CONFIG}
        onRemove={(dim, value) => filterState.removeValue(dim as ChargesFilterDim, value)}
        onClearAll={filterState.clearAll}
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={(e) => e.data && router.push(`/finance/charges/${e.data.id}`)}
        showColumnPicker={false}
        selectable
        massActions={massActions}
      />

      <CreateChargeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        form={createForm}
        onFormChange={handleFormChange}
        scopeOptions={scopeOptions}
        targetScopeOptions={targetScopeOptions}
        onSubmit={() => actions.runCreate(createForm, () => setCreateOpen(false))}
        pending={pending}
      />
      <EditChargeDialog
        editing={editing}
        targetScopeOptions={targetScopeOptions}
        onClose={() => setEditing(null)}
        onChange={(patch) => setEditing((prev) => (prev ? { ...prev, ...patch } : prev))}
        onSubmit={() => {
          if (!editing) return;
          actions.runEdit(editing, () => setEditing(null));
        }}
        pending={pending}
      />

      <ConfirmDialog
        open={!!publishing}
        title={publishing ? `Publish "${publishing.name}"?` : 'Publish this charge?'}
        description="Publishing flips the charge from draft to active and generates the full window of obligations. You can pause it later."
        confirmLabel="Publish"
        onConfirm={() => {
          if (publishing) actions.runPublish(publishing.id);
          setPublishing(null);
        }}
        onCancel={() => setPublishing(null)}
      />

      <ConfirmDialog
        open={!!archivingId}
        title="Archive this charge?"
        description="Related obligations stay put — archive just stops new obligation generation."
        confirmLabel="Archive"
        onConfirm={() => {
          if (archivingId) actions.runArchive(archivingId);
          setArchivingId(null);
        }}
        onCancel={() => setArchivingId(null)}
      />

      <ConfirmDialog
        open={!!bulkArchiving}
        title={
          bulkArchiving
            ? `Archive ${bulkArchiving.length} charge${bulkArchiving.length === 1 ? '' : 's'}?`
            : 'Archive selected charges?'
        }
        description="Related obligations stay put — archiving just stops new obligation generation on each selected charge."
        confirmLabel="Archive"
        onConfirm={() => {
          if (bulkArchiving) actions.runBulkArchive(bulkArchiving, () => gridApi?.deselectAll());
          setBulkArchiving(null);
        }}
        onCancel={() => setBulkArchiving(null)}
      />

      <ConfirmDialog
        open={!!deleting}
        title={deleting ? `Delete "${deleting.name}"?` : 'Delete this charge?'}
        description="Deletion is permanent and cannot be undone. Charges with any recorded payments must be archived instead."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleting) actions.runDelete(deleting.id);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
