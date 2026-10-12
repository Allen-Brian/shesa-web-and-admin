'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  ConfirmDialog,
  DataTable,
  EntityTablePanel,
  toast,
  type GridApi,
  type MassActions,
  type RowClickedEvent,
} from '@shesa/ui';

import { FilterChips } from '@/components/filters/filter-chips';
import { FilterDropdown } from '@/components/filters/filter-dropdown';
import { useFilterState } from '@/lib/memberships/filter-state';

import { setEngagement } from '../../../engagement-actions';
import { removeMembership } from '../../../membership-lifecycle-actions';
import type { MembersPageRow, MembersPageScope } from './members-page';
import { buildMembersColumns } from './members-columns';
import { buildMembersFilterDimensions } from './members-filter-dimensions';
import { buildMembersConfirmTitle } from './members-table-helpers';
import {
  ENGAGEMENT_TIERS,
  type EngagementTierValue,
  type MembersConfirmState,
  type SerialRow,
} from './members-table-types';

interface MembersTableProps {
  readonly scope: MembersPageScope;
  readonly rows: readonly MembersPageRow[];
  readonly onAdd?: () => void;
}

/**
 * Members table for a given scope. Filters hosted inside EntityTablePanel;
 * chip row below the panel; row click opens the member profile.
 */
export function MembersTable({ scope, rows, onAdd }: MembersTableProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<MembersConfirmState>(null);
  const [pending, startTransition] = useTransition();

  const isBranch = scope.scope_type === 'branch';
  const filterState = useFilterState();

  const numbered = useMemo<readonly SerialRow[]>(
    () => rows.map((r, i) => ({ ...r, serial: i + 1 })),
    [rows],
  );

  const dimensions = useMemo(() => buildMembersFilterDimensions(rows, isBranch), [rows, isBranch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const v = filterState.values;
    return numbered.filter((r) => {
      if (q) {
        const hit =
          r.full_name.toLowerCase().includes(q) ||
          r.batch_name?.toLowerCase().includes(q) ||
          r.network_name?.toLowerCase().includes(q) ||
          r.house_name?.toLowerCase().includes(q) ||
          r.branch_name?.toLowerCase().includes(q) ||
          r.location?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (v.batch?.length && (!r.batch_name || !v.batch.includes(r.batch_name))) return false;
      if (v.branch?.length && (!r.branch_name || !v.branch.includes(r.branch_name))) return false;
      if (v.house?.length && (!r.house_name || !v.house.includes(r.house_name))) return false;
      if (v.network?.length && (!r.network_name || !v.network.includes(r.network_name)))
        return false;
      if (v.engagement?.length && (!r.engagement || !v.engagement.includes(r.engagement)))
        return false;
      if (
        v.membership?.length &&
        (!r.membership_status || !v.membership.includes(r.membership_status))
      )
        return false;
      if (
        v.registration?.length &&
        (!r.registration_state || !v.registration.includes(r.registration_state))
      )
        return false;
      return true;
    });
  }, [numbered, search, filterState.values]);

  const runRemove = (targets: readonly SerialRow[]) => {
    startTransition(async () => {
      const results = await Promise.all(
        targets
          .filter((t) => t.membership_id)
          .map((t) => removeMembership(t.membership_id as string)),
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        toast.success(`Removed ${targets.length} membership${targets.length === 1 ? '' : 's'}.`);
      } else if (failed.length === targets.length) {
        toast.error(failed[0]?.ok === false ? failed[0].message : 'Could not remove.');
      } else {
        toast.error(`Removed ${targets.length - failed.length}; ${failed.length} failed.`);
      }
      router.refresh();
    });
  };

  const runSetEngagement = (targets: readonly SerialRow[], tier: EngagementTierValue) => {
    const membershipIds = targets.map((t) => t.membership_id).filter((id): id is string => !!id);
    if (membershipIds.length === 0) {
      toast.error('Selected rows have no memberships to update.');
      return;
    }
    startTransition(async () => {
      const result = await setEngagement({ membershipIds, tier });
      if (!result.ok) {
        toast.error(result.message ?? 'Could not update engagement.');
        return;
      }
      toast.success(
        `Engagement set to ${tier} for ${membershipIds.length} member${
          membershipIds.length === 1 ? '' : 's'
        }.`,
      );
      router.refresh();
    });
  };

  const columnDefs = useMemo(
    () =>
      buildMembersColumns({
        isBranch,
        onRemove: (row) => setConfirm({ kind: 'remove', targets: [row] }),
        onSetEngagement: (row, tier) => runSetEngagement([row], tier),
      }),
    [isBranch],
  );

  const handleRowClicked = (e: RowClickedEvent<SerialRow>) => {
    if (!e.data) return;
    router.push(`/exco/memberships/members/${scope.slug}/${e.data.member_id}`);
  };

  const massActions = useMemo<MassActions<SerialRow>>(
    () => ({
      itemName: 'member',
      pluralItemName: 'members',
      onDelete: (selected) => setConfirm({ kind: 'remove', targets: selected }),
      custom: ENGAGEMENT_TIERS.map((tier) => ({
        label: `Set engagement: ${tier}`,
        onClick: (selected: SerialRow[]) => runSetEngagement(selected, tier),
      })),
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'member' : 'members'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={!!onAdd}
        onCreate={() => onAdd?.()}
        createLabel="Add member"
        filters={
          <FilterDropdown
            dimensions={dimensions}
            values={filterState.values}
            onApply={filterState.setValues}
            onClearAll={filterState.clearAll}
            activeCount={filterState.activeCount}
          />
        }
      />

      {filterState.activeCount > 0 && (
        <FilterChips
          values={filterState.values}
          dimensions={dimensions}
          onRemove={filterState.removeValue}
          onClearAll={filterState.clearAll}
        />
      )}

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.membership_id ?? p.data.member_id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={handleRowClicked}
        showColumnPicker={false}
        massActions={massActions}
      />

      <ConfirmDialog
        open={!!confirm}
        title={buildMembersConfirmTitle(confirm)}
        description="Removing a member ends their membership at this scope. Their record is preserved."
        confirmLabel="Remove"
        onConfirm={() => {
          if (!confirm) return;
          const targets = confirm.targets;
          setConfirm(null);
          runRemove(targets);
        }}
        onCancel={() => setConfirm(null)}
      />

      {pending && <span className="sr-only">Working…</span>}
    </div>
  );
}
