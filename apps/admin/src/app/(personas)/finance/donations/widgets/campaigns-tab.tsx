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

import { buildCampaignsExport } from './donations-export';
import type { CampaignLifecycleFilter, CampaignRow, SerialCampaignRow } from './donations-types';

interface CampaignsTabProps {
  readonly campaigns: readonly CampaignRow[];
  readonly columnDefs: ColDef<SerialCampaignRow>[];
  readonly canCreate: boolean;
  readonly onOpenNewCampaign: () => void;
}

/**
 * Campaigns tab — mirror of `DonationsTab` but keyed to the campaigns
 * dataset. Search matches name + scope + description; the lifecycle
 * pill filter is orthogonal, so a search for "buea" narrowed by
 * "draft" only lists Buea drafts.
 */
export function CampaignsTab({
  campaigns,
  columnDefs,
  canCreate,
  onOpenNewCampaign,
}: CampaignsTabProps) {
  const [search, setSearch] = useState('');
  const [lifecycle, setLifecycle] = useState<CampaignLifecycleFilter>('all');
  const [gridApi, setGridApi] = useState<GridApi<SerialCampaignRow> | null>(null);

  const filtered = useMemo<readonly SerialCampaignRow[]>(() => {
    const q = search.trim().toLowerCase();
    return campaigns
      .filter((c) => {
        if (lifecycle !== 'all' && c.lifecycle !== lifecycle) return false;
        if (!q) return true;
        if (c.name.toLowerCase().includes(q)) return true;
        if (c.scopeName.toLowerCase().includes(q)) return true;
        if (c.description?.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((c, i) => ({ ...c, serial: i + 1 }));
  }, [campaigns, search, lifecycle]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'campaign' : 'campaigns'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={canCreate}
        createLabel="New campaign"
        onCreate={onOpenNewCampaign}
        actions={
          <ExportButton
            spec={() =>
              buildCampaignsExport(
                filtered,
                activeFilters({ Search: search.trim(), Lifecycle: lifecycle }),
              )
            }
            disabled={filtered.length === 0}
          />
        }
        filters={
          <Select
            value={lifecycle}
            onValueChange={(v) => setLifecycle(v as CampaignLifecycleFilter)}
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
      <DataTable<SerialCampaignRow>
        rowData={filtered as SerialCampaignRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable={false}
      />
    </div>
  );
}
