'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  DataTable,
  EntityTablePanel,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type RowClickedEvent,
} from '@shesa/ui';

export interface HouseRow {
  readonly serial: number;
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly nickname: string | null;
  readonly color: string;
  readonly color_hex: string;
  readonly member_count: number;
  readonly [key: string]: unknown;
}

/**
 * Houses list — always exactly four rows. Read-only per spec:
 *   - No selection (S/N column stands in for the checkbox)
 *   - No row-action menu
 *   - No create/import/export buttons on the entity panel
 * Row click navigates to the house detail (roster) page.
 */
export function HousesListView({ data }: { readonly data: readonly HouseRow[] }) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<HouseRow> | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.nickname?.toLowerCase().includes(q) ?? false) ||
        r.color.toLowerCase().includes(q),
    );
  }, [data, search]);

  const columnDefs = useMemo<ColDef<HouseRow>[]>(
    () => [
      {
        headerName: 'S/N',
        field: 'serial',
        width: 72,
        maxWidth: 72,
        sortable: false,
        filter: false,
        suppressMovable: true,
      },
      {
        headerName: 'Color',
        field: 'color_hex',
        width: 84,
        maxWidth: 84,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<HouseRow, string>) => (
          <ColorSwatch hex={params.value ?? '#000000'} />
        ),
      },
      {
        headerName: 'House name',
        field: 'name',
        flex: 1,
      },
      {
        headerName: 'Nickname',
        field: 'nickname',
        flex: 1,
        valueFormatter: (p) => p.value ?? '—',
      },
      {
        headerName: 'Members',
        field: 'member_count',
        flex: 1,
      },
    ],
    [],
  );

  const handleRowClicked = (e: RowClickedEvent<HouseRow>) => {
    if (!e.data) return;
    router.push(`/exco/clusters/houses/${e.data.slug}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={filtered.length}
        countLabel="houses"
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={false}
        hideCreate
        createLabel=""
        onCreate={() => undefined}
      />
      <DataTable<HouseRow>
        rowData={filtered as HouseRow[]}
        columnDefs={columnDefs}
        getRowId={(params) => params.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={handleRowClicked}
        showColumnPicker={false}
        selectable={false}
        pagination={false}
      />
    </div>
  );
}

function ColorSwatch({ hex }: { hex: string }) {
  return (
    <div className="h-full flex items-center">
      <div
        className="h-8 w-12 rounded-md border shadow-xs"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${hex} 82%, white) 0%, ${hex} 45%, color-mix(in srgb, ${hex} 55%, black) 100%)`,
        }}
        aria-hidden
      />
    </div>
  );
}
