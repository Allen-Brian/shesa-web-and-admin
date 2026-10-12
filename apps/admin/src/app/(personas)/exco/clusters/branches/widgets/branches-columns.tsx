import type { ColDef, ICellRendererParams } from '@shesa/ui';

import type { ScopeStatus } from '@/components/clusters/cluster-list';

import { BranchesCountryCell } from './branches-country-cell';
import { BranchesNameCell } from './branches-name-cell';
import { BranchesRowActionsMenu } from './branches-row-actions-menu';
import { BranchesSerialCell } from './branches-serial-cell';
import { BranchesStatusPill } from './branches-status-pill';
import { BranchesTerritoryText } from './branches-territory-text';
import type { BranchesSerialRow } from './branches-list-types';

interface BuildColumnsArgs {
  readonly expanded: ReadonlySet<string>;
  readonly onToggle: (branchId: string) => void;
  readonly onEdit: (row: BranchesSerialRow) => void;
  readonly onArchive: (row: BranchesSerialRow) => void;
  readonly onRestore: (row: BranchesSerialRow) => void;
}

/**
 * Column defs for the branches list. The Actions column suppresses on
 * chapter rows (chapter actions live on the detail page). Column widths
 * / flex ratios chosen to keep the country + region visible without
 * horizontal scroll on typical laptop widths.
 */
export function buildBranchesColumns({
  expanded,
  onToggle,
  onEdit,
  onArchive,
  onRestore,
}: BuildColumnsArgs): ColDef<BranchesSerialRow>[] {
  return [
    {
      headerName: 'S/N',
      field: 'serial',
      width: 96,
      maxWidth: 96,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellRenderer: (p: ICellRendererParams<BranchesSerialRow, number | null>) =>
        p.data ? (
          <BranchesSerialCell
            row={p.data}
            isExpanded={expanded.has(p.data.id)}
            onToggle={onToggle}
          />
        ) : null,
    },
    {
      headerName: 'Name',
      field: 'name',
      flex: 3,
      minWidth: 200,
      cellRenderer: (p: ICellRendererParams<BranchesSerialRow, string>) =>
        p.data ? <BranchesNameCell row={p.data} /> : null,
    },
    {
      headerName: 'Country',
      field: 'country_code',
      flex: 2,
      minWidth: 180,
      cellRenderer: (p: ICellRendererParams<BranchesSerialRow, string>) => (
        <BranchesCountryCell iso2={p.value ?? ''} />
      ),
    },
    { headerName: 'Region', field: 'region', flex: 2, minWidth: 140 },
    {
      headerName: 'Chapters',
      field: 'chapter_count',
      flex: 0.7,
      minWidth: 100,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      headerClass: 'ag-center-aligned-header',
      valueFormatter: (p) => (p.value == null ? '—' : String(p.value)),
    },
    {
      headerName: 'Members',
      field: 'member_count',
      flex: 0.7,
      minWidth: 100,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      headerClass: 'ag-center-aligned-header',
    },
    {
      headerName: 'Territory',
      field: 'country_code',
      colId: 'territory',
      flex: 1,
      minWidth: 130,
      cellRenderer: (p: ICellRendererParams<BranchesSerialRow, string>) => (
        <BranchesTerritoryText iso2={p.value ?? ''} />
      ),
    },
    {
      headerName: 'Status',
      field: 'status',
      flex: 0.8,
      minWidth: 110,
      cellRenderer: (p: ICellRendererParams<BranchesSerialRow, ScopeStatus>) => (
        <BranchesStatusPill status={p.value ?? 'active'} />
      ),
    },
    {
      headerName: '',
      colId: 'actions',
      width: 64,
      maxWidth: 64,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellRenderer: (p: ICellRendererParams<BranchesSerialRow>) => {
        if (!p.data) return null;
        if (p.data._kind === 'chapter') return null;
        return (
          <BranchesRowActionsMenu
            row={p.data}
            onEdit={onEdit}
            onArchive={onArchive}
            onRestore={onRestore}
          />
        );
      },
    },
  ];
}
