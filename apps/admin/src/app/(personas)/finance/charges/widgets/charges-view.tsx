'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard } from 'lucide-react';

import { ConfirmDialog, DataTable, EntityTablePanel, type GridApi } from '@shesa/ui';

import { FilterChips } from '@/components/filters/filter-chips';
import { FilterDropdown } from '@/components/filters/filter-dropdown';
import { useFilterState } from '@/lib/filters/use-filter-state';

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
}: ChargesViewProps) {
  const router = useRouter();
  const actions = useChargesActions({ scopeOptions });
  const { pending } = actions;

  const filterState = useFilterState<ChargesFilterDim>(CHARGES_FILTER_DIMENSIONS);

  const [search, setSearch] = useState('');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(() =>
    initialCreate(defaultIndividualScopeId),
  );
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [publishing, setPublishing] = useState<ChargeRow | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ChargeRow | null>(null);

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

  const openCreate = () => {
    setCreateForm(initialCreate(defaultIndividualScopeId));
    setCreateOpen(true);
  };

  // Type flips between Individual and Group flip the owner scope in
  // lockstep: Group charges always land on mainstream, Individual
  // charges on the operator's default. The dialog itself doesn't
  // surface the field.
  const handleFormChange = (patch: Partial<CreateForm>) => {
    setCreateForm((f) => {
      const next = { ...f, ...patch };
      if (patch.targetPartyType && patch.targetPartyType !== f.targetPartyType) {
        next.scopeId =
          patch.targetPartyType === 'branch' ? mainstreamScopeId : defaultIndividualScopeId;
      }
      return next;
    });
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
          Dues + levies at scopes you can see. Individual charges fan out to members; Group charges
          land one obligation per branch/batch with per-target amounts.
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
        selectable={false}
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
