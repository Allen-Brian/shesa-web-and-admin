import type { ColDef, ICellRendererParams } from '@shesa/ui';

import type { ScopeStatus } from '@/components/clusters/cluster-list';

import type { ChapterSerialRow } from './branch-detail-types';
import { ChapterKindText } from './chapter-kind-text';
import { ChapterRowActionsMenu } from './chapter-row-actions-menu';
import { ChapterStatusPill } from './chapter-status-pill';

interface BuildBranchChapterColumnsArgs {
  readonly onEdit: (row: ChapterSerialRow) => void;
  readonly onArchive: (row: ChapterSerialRow) => void;
  readonly onRestore: (row: ChapterSerialRow) => void;
}

export function buildBranchChapterColumns({
  onEdit,
  onArchive,
  onRestore,
}: BuildBranchChapterColumnsArgs): ColDef<ChapterSerialRow>[] {
  return [
    {
      headerName: 'S/N',
      field: 'serial',
      width: 72,
      maxWidth: 72,
      sortable: false,
      filter: false,
      suppressMovable: true,
    },
    { headerName: 'Chapter', field: 'name', flex: 3, minWidth: 200 },
    {
      headerName: 'Kind',
      field: 'chapter_kind',
      flex: 1,
      minWidth: 130,
      cellRenderer: (p: ICellRendererParams<ChapterSerialRow, string>) => (
        <ChapterKindText kind={p.value === 'autonomous' ? 'autonomous' : 'grouping'} />
      ),
    },
    { headerName: 'Region', field: 'region', flex: 2, minWidth: 130 },
    { headerName: 'City', field: 'city', flex: 2, minWidth: 130 },
    {
      headerName: 'Members',
      field: 'member_count',
      flex: 0.7,
      minWidth: 110,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      headerClass: 'ag-center-aligned-header',
    },
    {
      headerName: 'Status',
      field: 'status',
      flex: 0.9,
      minWidth: 110,
      cellRenderer: (p: ICellRendererParams<ChapterSerialRow, ScopeStatus>) => (
        <ChapterStatusPill status={p.value ?? 'active'} />
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
      cellRenderer: (p: ICellRendererParams<ChapterSerialRow>) =>
        p.data ? (
          <ChapterRowActionsMenu
            row={p.data}
            onEdit={onEdit}
            onArchive={onArchive}
            onRestore={onRestore}
          />
        ) : null,
    },
  ];
}
