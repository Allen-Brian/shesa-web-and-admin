'use client';

import { useMemo, useState } from 'react';

import { DataTable, EntityTablePanel, type GridApi } from '@shesa/ui';

import { buildPositionRows } from './build-position-rows';
import type {
  GovernancePositionCatalogRow,
  GovernancePositionHolderRow,
  GovernanceRoleHolderRow,
  PositionTableRow,
} from './governance-types';
import { usePositionColumns } from './use-position-columns';

interface PositionsTableProps {
  readonly scopeLabel: string;
  readonly positionCatalog: readonly GovernancePositionCatalogRow[];
  readonly positionHolders: readonly GovernancePositionHolderRow[];
  readonly roleHolders: readonly GovernanceRoleHolderRow[];
  readonly canManage: boolean;
  /**
   * True only for a Mainstream admin — extending the catalog requires
   * `scope.manage_capabilities` at Mainstream. Branch admins see the
   * table (and can assign holders) but can't add new positions.
   */
  readonly canCreate: boolean;
  readonly onCreate: () => void;
  readonly emptyHint: string;
  readonly onAssignMember: (position: GovernancePositionCatalogRow) => void;
  readonly onRemoveHolder: (holder: GovernancePositionHolderRow) => void;
  readonly onGrantRole: (holder: GovernancePositionHolderRow) => void;
  readonly onRevokeRole: (role: GovernanceRoleHolderRow) => void;
}

/**
 * Governance positions rendered as an EntityTablePanel + DataTable.
 * Autoheight so the grid grows to fit its rows without relying on a
 * flex-1 chain up through the Tabs shell (branch settings and
 * mainstream settings nest us differently).
 */
export function PositionsTable(props: PositionsTableProps) {
  const [search, setSearch] = useState('');
  const [gridApi, setGridApi] = useState<GridApi<PositionTableRow> | null>(null);

  const rows = useMemo<PositionTableRow[]>(
    () => buildPositionRows(props.positionCatalog, props.positionHolders, props.roleHolders),
    [props.positionCatalog, props.positionHolders, props.roleHolders],
  );

  const filtered = useMemo<PositionTableRow[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.position.toLowerCase().includes(q) ||
        !!r.description?.toLowerCase().includes(q) ||
        !!r.holder?.memberName.toLowerCase().includes(q) ||
        !!r.role?.roleName.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const catalogById = useMemo(
    () => new Map(props.positionCatalog.map((c) => [c.id, c])),
    [props.positionCatalog],
  );
  const holderById = useMemo(
    () => new Map(props.positionHolders.map((h) => [h.assignmentId, h])),
    [props.positionHolders],
  );
  const roleById = useMemo(
    () => new Map(props.roleHolders.map((r) => [r.assignmentId, r])),
    [props.roleHolders],
  );

  const columnDefs = usePositionColumns({
    canManage: props.canManage,
    catalogById,
    holderById,
    roleById,
    onAssignMember: props.onAssignMember,
    onRemoveHolder: props.onRemoveHolder,
    onGrantRole: props.onGrantRole,
    onRevokeRole: props.onRevokeRole,
  });

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Positions
        </h3>
        <p className="text-xs text-muted-foreground">
          The executive slate for {props.scopeLabel}. Assign a member and — where portal access is
          needed — a role from the same row.
        </p>
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'position' : 'positions'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={props.canCreate}
        hideCreate={!props.canCreate}
        createLabel="New position"
        onCreate={props.onCreate}
      />

      {props.positionCatalog.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {props.emptyHint}
        </div>
      ) : (
        <DataTable<PositionTableRow>
          rowData={filtered}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.positionCatalogId}
          onGridReady={(e) => setGridApi(e.api)}
          showColumnPicker={false}
          selectable={false}
          autoHeight
          pagination={false}
        />
      )}
    </section>
  );
}
