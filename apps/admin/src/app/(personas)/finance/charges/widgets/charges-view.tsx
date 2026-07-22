'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard } from 'lucide-react';

import { ConfirmDialog, DataTable, EntityTablePanel, type GridApi } from '@shesa/ui';

import { buildChargeColumns } from './charge-columns';
import { CreateChargeDialog } from './create-charge-dialog';
import { ChargesKpiStrip } from './charges-kpi-strip';
import { ChargesTableFilters } from './charges-table-filters';
import { buildChargeKpis } from './charges-kpis';
import { initialCreate, toEditForm } from './charges-helpers';
import type {
  ChargeRow,
  CreateForm,
  EditForm,
  ScopeOption,
  SerialRow,
  ShapeFilter,
  StatusFilter,
  TargetScopeOption,
  TypeFilter,
} from './charges-types';
import { EditChargeDialog } from './edit-charge-dialog';
import { useChargesActions } from './use-charges-actions';

interface ChargesViewProps {
  readonly charges: readonly ChargeRow[];
  readonly scopeOptions: readonly ScopeOption[];
  readonly targetScopeOptions: readonly TargetScopeOption[];
}

/**
 * Charges portfolio — KPI strip + filterable DataTable + two dialogs
 * (create draft, edit metadata) + archive confirm. Row-click routes
 * to the charge-detail drill-down. Every rendered chunk delegates to
 * a sibling widget so this file stays under the 200-line cap.
 */
export function ChargesView({ charges, scopeOptions, targetScopeOptions }: ChargesViewProps) {
  const router = useRouter();
  const actions = useChargesActions({ scopeOptions });
  const { pending } = actions;

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [shapeFilter, setShapeFilter] = useState<ShapeFilter>('all');
  const [search, setSearch] = useState('');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(() => initialCreate(scopeOptions));
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ChargeRow | null>(null);

  const kpis = useMemo(() => buildChargeKpis(charges), [charges]);

  const filtered = useMemo<readonly SerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return charges
      .filter((c) => {
        if (typeFilter !== 'all' && c.targetPartyType !== typeFilter) return false;
        if (statusFilter !== 'all' && c.status !== statusFilter) return false;
        if (shapeFilter !== 'all' && c.shape !== shapeFilter) return false;
        if (!q) return true;
        if (c.name.toLowerCase().includes(q)) return true;
        if (c.scopeName.toLowerCase().includes(q)) return true;
        if (c.description?.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((c, i) => ({ ...c, serial: i + 1 }));
  }, [charges, search, statusFilter, shapeFilter, typeFilter]);

  const columnDefs = useMemo(
    () =>
      buildChargeColumns({
        pending,
        onEdit: (row) => setEditing(toEditForm(row)),
        onArchive: setArchivingId,
        onDelete: setDeleting,
      }),
    [pending],
  );

  const openCreate = () => {
    setCreateForm(initialCreate(scopeOptions));
    setCreateOpen(true);
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
          <ChargesTableFilters
            type={typeFilter}
            onTypeChange={setTypeFilter}
            shape={shapeFilter}
            onShapeChange={setShapeFilter}
            status={statusFilter}
            onStatusChange={setStatusFilter}
          />
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

      <CreateChargeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        form={createForm}
        onFormChange={(patch) => setCreateForm((f) => ({ ...f, ...patch }))}
        scopeOptions={scopeOptions}
        targetScopeOptions={targetScopeOptions}
        onSubmit={() => actions.runCreate(createForm, () => setCreateOpen(false))}
        pending={pending}
      />
      <EditChargeDialog
        editing={editing}
        onClose={() => setEditing(null)}
        onChange={(patch) => setEditing((prev) => (prev ? { ...prev, ...patch } : prev))}
        onSubmit={() => {
          if (!editing) return;
          actions.runEdit(editing, () => setEditing(null));
        }}
        pending={pending}
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
