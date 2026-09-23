'use client';

import { useMemo, useState } from 'react';
import type { ColDef } from '@shesa/ui';

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

import { buildDonationsExport } from './donations-export';
import type { DonationRow, DonorFilter, SerialDonationRow } from './donations-types';

interface DonationsTabProps {
  readonly donations: readonly DonationRow[];
  readonly columnDefs: ColDef<SerialDonationRow>[];
  readonly canWalkIn: boolean;
  readonly onOpenWalkIn: () => void;
}

/**
 * Donations tab — search + donor-filter + walk-in button, then the
 * DataTable. Filter state is local: the tab is only rendered when
 * selected, and re-opening it with a fresh filter isn't the flow
 * (operators typically stay on one filter for a session).
 */
export function DonationsTab({
  donations,
  columnDefs,
  canWalkIn,
  onOpenWalkIn,
}: DonationsTabProps) {
  const [search, setSearch] = useState('');
  const [donorFilter, setDonorFilter] = useState<DonorFilter>('all');
  const [gridApi, setGridApi] = useState<GridApi<SerialDonationRow> | null>(null);

  const filtered = useMemo<readonly SerialDonationRow[]>(() => {
    const q = search.trim().toLowerCase();
    return donations
      .filter((d) => {
        if (donorFilter === 'member' && !d.isMember) return false;
        if (donorFilter === 'public' && !d.isPublic) return false;
        if (donorFilter === 'walkin' && (d.isMember || d.isPublic)) return false;
        if (!q) return true;
        if (d.campaignName.toLowerCase().includes(q)) return true;
        if (d.donorLabel.toLowerCase().includes(q)) return true;
        if (d.scopeName.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((d, i) => ({ ...d, serial: i + 1 }));
  }, [donations, search, donorFilter]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'donation' : 'donations'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={canWalkIn}
        createLabel="Record walk-in"
        onCreate={onOpenWalkIn}
        actions={
          <ExportButton
            spec={() =>
              buildDonationsExport(
                filtered,
                activeFilters({ Search: search.trim(), Donor: donorFilter }),
              )
            }
            disabled={filtered.length === 0}
          />
        }
        filters={
          <Select value={donorFilter} onValueChange={(v) => setDonorFilter(v as DonorFilter)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All donors</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="public">Public site</SelectItem>
              <SelectItem value="walkin">Walk-ins</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <DataTable<SerialDonationRow>
        rowData={filtered as SerialDonationRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable={false}
      />
    </div>
  );
}
