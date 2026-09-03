'use client';

import { useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';

import { Badge, type ColDef, type ICellRendererParams } from '@shesa/ui';

import { PositionRowActions } from './position-row-actions';
import type {
  GovernancePositionCatalogRow,
  GovernancePositionHolderRow,
  GovernanceRoleHolderRow,
  PositionTableRow,
} from './governance-types';

interface UsePositionColumnsArgs {
  readonly canManage: boolean;
  readonly catalogById: Map<string, GovernancePositionCatalogRow>;
  readonly holderById: Map<string, GovernancePositionHolderRow>;
  readonly roleById: Map<string, GovernanceRoleHolderRow>;
  readonly onAssignMember: (position: GovernancePositionCatalogRow) => void;
  readonly onRemoveHolder: (holder: GovernancePositionHolderRow) => void;
  readonly onGrantRole: (holder: GovernancePositionHolderRow) => void;
  readonly onRevokeRole: (role: GovernanceRoleHolderRow) => void;
}

/**
 * Column definitions for the governance PositionsTable. Extracted so
 * the container file stays under the 150-line ceiling.
 */
export function usePositionColumns(args: UsePositionColumnsArgs): ColDef<PositionTableRow>[] {
  return useMemo<ColDef<PositionTableRow>[]>(
    () => [
      {
        headerName: 'S/N',
        field: 'serial',
        width: 68,
        maxWidth: 68,
        sortable: false,
        filter: false,
        suppressMovable: true,
      },
      {
        headerName: 'Position',
        field: 'position',
        flex: 1,
        minWidth: 180,
        cellRenderer: (p: ICellRendererParams<PositionTableRow, string>) => (
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">{p.value}</span>
          </div>
        ),
      },
      {
        headerName: 'Description',
        field: 'description',
        flex: 2,
        minWidth: 220,
        valueFormatter: (p) => p.value ?? '—',
        cellClass: 'text-muted-foreground text-xs',
      },
      {
        headerName: 'Holder',
        colId: 'holder',
        flex: 1.2,
        minWidth: 180,
        cellRenderer: (p: ICellRendererParams<PositionTableRow>) =>
          p.data?.holder ? (
            <span>{p.data.holder.memberName}</span>
          ) : (
            <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
              Vacant
            </Badge>
          ),
      },
      {
        headerName: 'Role',
        colId: 'role',
        width: 160,
        cellRenderer: (p: ICellRendererParams<PositionTableRow>) =>
          p.data?.role ? (
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              title={p.data.role.roleKey}
            >
              {p.data.role.roleName}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">None</span>
          ),
      },
      {
        headerName: '',
        colId: 'row_actions',
        width: 64,
        maxWidth: 64,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<PositionTableRow>) => {
          if (!p.data || !args.canManage) return null;
          return (
            <PositionRowActions
              row={p.data}
              catalogById={args.catalogById}
              holderById={args.holderById}
              roleById={args.roleById}
              onAssignMember={args.onAssignMember}
              onRemoveHolder={args.onRemoveHolder}
              onGrantRole={args.onGrantRole}
              onRevokeRole={args.onRevokeRole}
            />
          );
        },
      },
    ],
    [
      args.catalogById,
      args.holderById,
      args.roleById,
      args.canManage,
      args.onAssignMember,
      args.onRemoveHolder,
      args.onGrantRole,
      args.onRevokeRole,
    ],
  );
}
