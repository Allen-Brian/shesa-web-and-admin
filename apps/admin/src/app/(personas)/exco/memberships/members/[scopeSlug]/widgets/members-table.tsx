'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Sparkles, Trash2, UserMinus } from 'lucide-react';

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
}

const ENGAGEMENT_TIERS = ['dormant', 'normal', 'engaged', 'committed'] as const;

export function MembersTable({ scope, rows }: MembersTableProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [pending, startTransition] = useTransition();

  const isBatch = scope.scope_type === 'batch';
  const isBranch = scope.scope_type === 'branch';

  const numbered = useMemo<readonly SerialRow[]>(
    () => rows.map((r, i) => ({ ...r, serial: i + 1 })),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return numbered;
    return numbered.filter((r) => {
      if (r.full_name.toLowerCase().includes(q)) return true;
      if (r.batch_name?.toLowerCase().includes(q)) return true;
      if (r.network_name?.toLowerCase().includes(q)) return true;
      if (r.house_name?.toLowerCase().includes(q)) return true;
      if (r.branch_name?.toLowerCase().includes(q)) return true;
      if (r.location?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [numbered, search]);

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
    tier: 'dormant' | 'normal' | 'engaged' | 'committed',
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

    // Batch column: hidden when viewer scope is a batch (redundant).
    if (!isBatch) {
      defs.push({
        headerName: 'Batch',
        field: 'batch_name',
        width: 120,
        valueFormatter: (p) => p.value ?? '—',
      });
    }

    // Branch column: hidden when viewer scope is a branch (redundant).
    // Shown for batch context so a batch admin can see where each of
    // their members currently belongs geographically.
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

    // Engagement + membership_status are always distinct columns for
    // branch/chapter contexts. For batches, both are '—' — batches
    // don't carry membership rows so they have no engagement or per-
    // scope membership status.
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
      width: 130,
      cellRenderer: (p: ICellRendererParams<SerialRow, string | null>) => (
        <EngagementBadge tier={p.value ?? null} />
      ),
    });

    // Registration column: only meaningful for branch/chapter memberships.
    if (!isBatch) {
      defs.push({
        headerName: 'Registration',
        field: 'registration_state',
        width: 150,
        cellRenderer: (p: ICellRendererParams<SerialRow, string | null>) => (
          <RegistrationBadge state={p.value ?? null} />
        ),
      });
    }

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
            isBatch={isBatch}
            onRemove={() => setConfirm({ kind: 'remove', targets: [params.data as SerialRow] })}
            onSetEngagement={(tier) => runSetEngagement([params.data as SerialRow], tier)}
          />
        ) : null,
    });

    return defs;
  }, [isBatch, isBranch]);

  const handleRowClicked = (e: RowClickedEvent<SerialRow>) => {
    if (!e.data) return;
    router.push(`/exco/memberships/members/${scope.slug}/${e.data.member_id}`);
  };

  const massActions = useMemo<MassActions<SerialRow>>(
    () => ({
      itemName: 'member',
      pluralItemName: 'members',
      onDelete: (selected) => setConfirm({ kind: 'remove', targets: selected }),
      custom: isBatch
        ? undefined
        : ENGAGEMENT_TIERS.map((tier) => ({
            label: `Set engagement: ${tier}`,
            onClick: (selected: SerialRow[]) => runSetEngagement(selected, tier),
          })),
    }),
    [isBatch],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'member' : 'members'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={false}
        hideCreate
        createLabel=""
        onCreate={() => undefined}
      />
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
        description={
          isBatch
            ? 'Removing a member from the batch keeps their record but detaches them from this batch. Not undoable without recreating the link.'
            : 'Removing a member ends their membership at this scope. Their record is preserved.'
        }
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

function EngagementBadge({ tier }: { readonly tier: string | null }) {
  if (!tier) return <span className="text-muted-foreground">—</span>;
  const styles: Record<string, string> = {
    dormant: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
    normal: 'border-border bg-background text-foreground',
    engaged: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    committed: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  };
  return (
    <Badge variant="outline" className={styles[tier] ?? 'border-border text-foreground'}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </Badge>
  );
}

function RegistrationBadge({ state }: { readonly state: string | null }) {
  if (!state) return <span className="text-muted-foreground">—</span>;
  const styles: Record<string, string> = {
    not_required: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
    pending: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    paid: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    paid_on_behalf:
      'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    waived: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  };
  const labels: Record<string, string> = {
    not_required: 'Not required',
    pending: 'Pending',
    paid: 'Paid',
    paid_on_behalf: 'Paid on behalf',
    waived: 'Waived',
  };
  return (
    <Badge variant="outline" className={styles[state] ?? 'border-border text-foreground'}>
      {labels[state] ?? state}
    </Badge>
  );
}

function RowActions({
  row,
  isBatch,
  onRemove,
  onSetEngagement,
}: {
  readonly row: SerialRow;
  readonly isBatch: boolean;
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
        {!isBatch && row.membership_id && (
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
          {isBatch ? (
            <>
              <Trash2 className="h-4 w-4" />
              Detach from batch
            </>
          ) : (
            <>
              <UserMinus className="h-4 w-4" />
              Remove from scope
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
