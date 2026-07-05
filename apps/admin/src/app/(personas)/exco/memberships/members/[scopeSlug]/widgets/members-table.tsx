'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Sparkles, UserMinus } from 'lucide-react';

import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EntityTablePanel,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type MassActions,
  type RowClickedEvent,
} from '@shesa/ui';

import { MemberName } from '@/components/governance/member-name';
import { EngagementStars } from '@/components/memberships/engagement-stars';
import { FilterChips } from '@/components/memberships/filter-chips';
import {
  FilterDropdown,
  type FilterDimensionConfig,
} from '@/components/memberships/filter-dropdown';
import { RegistrationIcon } from '@/components/memberships/registration-icon';
import type { EngagementTier } from '@shesa/domain/memberships';
import { useFilterState } from '@/lib/memberships/filter-state';

import { removeMembership, setEngagement } from '../../../actions';
import type { MembersPageRow, MembersPageScope } from './members-page';

type SerialRow = MembersPageRow & { readonly serial: number };

type ConfirmState = null | {
  readonly kind: 'remove';
  readonly targets: readonly SerialRow[];
};

interface MembersTableProps {
  readonly scope: MembersPageScope;
  readonly rows: readonly MembersPageRow[];
  readonly onAdd?: () => void;
}

const ENGAGEMENT_TIERS = ['dormant', 'normal', 'engaged', 'committed', 'pillar'] as const;

export function MembersTable({ scope, rows, onAdd }: MembersTableProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [pending, startTransition] = useTransition();

  const isBranch = scope.scope_type === 'branch';

  const filterState = useFilterState();

  const numbered = useMemo<readonly SerialRow[]>(
    () => rows.map((r, i) => ({ ...r, serial: i + 1 })),
    [rows],
  );

  // Filter dimensions built from actual row values (no dead options).
  // Scope-aware exclusion: Branch dimension hidden when viewer is a
  // branch (matches the column-hide rule).
  const dimensions = useMemo<FilterDimensionConfig[]>(() => {
    const configs: FilterDimensionConfig[] = [];

    configs.push({
      dimension: 'batch',
      label: 'Batch',
      options: sortedUnique(rows.map((r) => r.batch_name)).map((v) => ({ value: v, label: v })),
    });
    if (!isBranch) {
      configs.push({
        dimension: 'branch',
        label: 'Branch',
        options: sortedUnique(rows.map((r) => r.branch_name)).map((v) => ({ value: v, label: v })),
      });
    }
    configs.push({
      dimension: 'house',
      label: 'House',
      options: sortedUnique(rows.map((r) => r.house_name)).map((v) => ({ value: v, label: v })),
    });
    configs.push({
      dimension: 'network',
      label: 'Network',
      options: sortedUnique(rows.map((r) => r.network_name)).map((v) => ({ value: v, label: v })),
    });
    configs.push({
      dimension: 'engagement',
      label: 'Engagement',
      options: ENGAGEMENT_TIERS.map((v) => ({
        value: v,
        label: v.charAt(0).toUpperCase() + v.slice(1),
      })),
    });
    configs.push({
      dimension: 'membership',
      label: 'Membership status',
      options: (['active', 'passive', 'pending'] as const).map((v) => ({
        value: v,
        label: v.charAt(0).toUpperCase() + v.slice(1),
      })),
    });
    configs.push({
      dimension: 'registration',
      label: 'Registration',
      options: (['not_required', 'pending', 'paid', 'paid_on_behalf', 'waived'] as const).map(
        (v) => ({
          value: v,
          label:
            v === 'not_required'
              ? 'Not required'
              : v === 'paid_on_behalf'
                ? 'Paid on behalf'
                : v.charAt(0).toUpperCase() + v.slice(1),
        }),
      ),
    });

    return configs;
  }, [isBranch, rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const v = filterState.values;
    return numbered.filter((r) => {
      // Search text
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
      // Multi-select filters — every set dimension must include the row's value
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

  const runSetEngagement = (
    targets: readonly SerialRow[],
    tier: (typeof ENGAGEMENT_TIERS)[number],
  ) => {
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

  const columnDefs = useMemo<ColDef<SerialRow>[]>(() => {
    // Context-aware column model: hide the column matching the viewing
    // scope. Two-column rule: engagement + membership_status ALWAYS
    // stay separate. Never merge them.
    const defs: ColDef<SerialRow>[] = [
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
        headerName: 'Name',
        field: 'full_name',
        flex: 2,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) =>
          p.data ? <MemberName name={p.data.full_name} badge={p.data.badge} /> : null,
      },
    ];

    defs.push({
      headerName: 'Batch',
      field: 'batch_name',
      width: 120,
      valueFormatter: (p) => p.value ?? '—',
    });

    // Branch column: hidden when viewer scope is a branch (redundant).
    // Kept for autonomous-chapter context so their members' geographic
    // affiliation stays visible.
    if (!isBranch) {
      defs.push({
        headerName: 'Branch',
        field: 'branch_name',
        width: 160,
        valueFormatter: (p) => p.value ?? '—',
      });
    }

    defs.push(
      {
        headerName: 'Network',
        field: 'network_name',
        width: 140,
        valueFormatter: (p) => p.value ?? '—',
      },
      {
        headerName: 'House',
        field: 'house_name',
        width: 120,
        valueFormatter: (p) => p.value ?? '—',
      },
      {
        headerName: 'Location',
        field: 'location',
        flex: 1.5,
        minWidth: 160,
        valueFormatter: (p) => p.value ?? '—',
      },
    );

    // Engagement + membership_status stay as two distinct columns —
    // they answer different questions and MUST NOT be collapsed.
    defs.push({
      headerName: 'Membership',
      field: 'membership_status',
      width: 130,
      cellRenderer: (p: ICellRendererParams<SerialRow, string | null>) => (
        <MembershipStatusBadge status={p.value ?? null} />
      ),
    });
    defs.push({
      headerName: 'Engagement',
      field: 'engagement',
      width: 140,
      cellRenderer: (p: ICellRendererParams<SerialRow, string | null>) => (
        <EngagementStars tier={(p.value ?? null) as EngagementTier | null} />
      ),
    });

    defs.push({
      headerName: 'Registration',
      field: 'registration_state',
      width: 160,
      cellRenderer: (p: ICellRendererParams<SerialRow, string | null>) => (
        <RegistrationIcon state={p.value ?? null} />
      ),
    });

    defs.push({
      headerName: 'Joined',
      field: 'joined_at',
      width: 130,
      valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
    });

    defs.push({
      headerName: 'Actions',
      colId: 'actions',
      width: 96,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellRenderer: (params: ICellRendererParams<SerialRow>) =>
        params.data ? (
          <RowActions
            row={params.data}
            onRemove={() => setConfirm({ kind: 'remove', targets: [params.data as SerialRow] })}
            onSetEngagement={(tier) => runSetEngagement([params.data as SerialRow], tier)}
          />
        ) : null,
    });

    return defs;
  }, [isBranch]);

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
        title={buildConfirmTitle(confirm)}
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

function buildConfirmTitle(confirm: ConfirmState): string {
  if (!confirm) return '';
  const n = confirm.targets.length;
  if (n === 1) return `Remove ${confirm.targets[0]?.full_name ?? 'this member'}?`;
  return `Remove ${n} members?`;
}

function MembershipStatusBadge({ status }: { readonly status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const styles: Record<string, string> = {
    active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    passive: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    pending: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  };
  return (
    <Badge variant="outline" className={styles[status] ?? 'border-border text-foreground'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function RowActions({
  row,
  onRemove,
  onSetEngagement,
}: {
  readonly row: SerialRow;
  readonly onRemove: () => void;
  readonly onSetEngagement: (tier: (typeof ENGAGEMENT_TIERS)[number]) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-md p-0"
          aria-label="Row actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {row.membership_id && (
          <>
            <DropdownMenuLabel>Engagement</DropdownMenuLabel>
            {ENGAGEMENT_TIERS.map((tier) => (
              <DropdownMenuItem key={tier} onClick={() => onSetEngagement(tier)}>
                <Sparkles className="h-4 w-4" />
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onRemove}>
          <UserMinus className="h-4 w-4" />
          Remove from scope
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Case-insensitive dedup + sort of a nullable string list, used to
 * derive filter-dimension option lists from the actual row set.
 */
function sortedUnique(values: readonly (string | null | undefined)[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    if (v == null) continue;
    const trimmed = v.trim();
    if (trimmed.length > 0) set.add(trimmed);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
