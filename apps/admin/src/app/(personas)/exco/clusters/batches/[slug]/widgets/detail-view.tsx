'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Download, Pencil, RefreshCw, Upload } from 'lucide-react';

import {
  Badge,
  BackLink,
  Button,
  ConfirmDialog,
  DataTable,
  EntityTablePanel,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type MassActions,
} from '@shesa/ui';

import type { ScopeStatus } from '@/components/clusters/cluster-list';
import type { ExcoBadgeInfo } from '@/components/governance/exco-badge';
import { MemberName } from '@/components/governance/member-name';
import {
  GovernancePanel,
  type GovernancePositionCatalogRow,
  type GovernancePositionHolderRow,
  type GovernanceRoleHolderRow,
} from '@/components/governance/governance-panel';
import type { GovernanceMemberPickerRow } from '@/components/governance/assign-position-dialog';
import { formatOrdinal } from '@/lib/batches/ordinal';

import { archiveBatch, deleteBatchMember } from '../../actions';
import { BatchFormDialog } from '../../widgets/form-dialog';
import { BatchImportDialog } from './batch-import-dialog';
import { CreateMemberDialog } from './create-member-dialog';

export interface BatchMemberRow {
  readonly id: string;
  readonly member_id: string;
  readonly member_code: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly badge: ExcoBadgeInfo | null;
  readonly house_name: string;
  readonly network_name: string;
  readonly branch_name: string | null;
  readonly membership_status: 'active' | 'passive' | 'pending' | null;
  readonly location: string | null;
}

interface RefOption {
  readonly id: string;
  readonly name: string;
}

interface BatchDetailViewProps {
  readonly scopeId: string;
  readonly name: string;
  readonly slug: string;
  readonly status: ScopeStatus;
  readonly entryYear: number;
  readonly ordinal: number | null;
  readonly nickname: string | null;
  readonly description: string | null;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
  readonly memberCount: number;
  readonly members: readonly BatchMemberRow[];
  readonly houseOptions: readonly RefOption[];
  readonly networkOptions: readonly RefOption[];
  readonly positionCatalog: readonly GovernancePositionCatalogRow[];
  readonly positionHolders: readonly GovernancePositionHolderRow[];
  readonly roleHolders: readonly GovernanceRoleHolderRow[];
  readonly memberPicker: readonly GovernanceMemberPickerRow[];
  readonly canUpdate: boolean;
  readonly canManageGovernance: boolean;
  readonly canManageMembers: boolean;
}

export function BatchDetailView(props: BatchDetailViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const isArchived = props.status === 'archived';
  const ordinalLabel = formatOrdinal(props.ordinal);

  const doArchive = () => {
    startTransition(async () => {
      const result = await archiveBatch(props.scopeId);
      if (!result.ok) {
        toast.error(result.message ?? 'Could not archive.');
        return;
      }
      toast.success(`${props.name} archived.`);
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <BackLink href="/exco/clusters/batches" label="Back to batches" />

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{props.name}</h1>
            {props.nickname && (
              <Badge variant="outline" className="text-xs">
                {props.nickname}
              </Badge>
            )}
            {ordinalLabel && (
              <Badge variant="outline" className="text-xs">
                {ordinalLabel} Batch
              </Badge>
            )}
            {isArchived && (
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              >
                Archived
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Entry year {props.entryYear}
            {props.description ? ` · ${props.description}` : ''}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-start sm:items-end">
          <span className="text-3xl font-semibold text-foreground">{props.memberCount}</span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {props.memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>
      </div>

      <Tabs defaultValue="members" className="flex min-h-0 flex-1 flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
          </TabsList>
          {props.canUpdate && (
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              {!isArchived && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setConfirmArchive(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Archive className="h-4 w-4" />
                  {pending ? 'Archiving…' : 'Archive'}
                </Button>
              )}
            </div>
          )}
        </div>

        <TabsContent value="members" className="flex min-h-0 flex-1 flex-col gap-3">
          <MembersTable
            batchScopeId={props.scopeId}
            batchSlug={props.slug}
            batchName={props.name}
            entryYear={props.entryYear}
            members={props.members}
            houseOptions={props.houseOptions}
            networkOptions={props.networkOptions}
            canManageMembers={props.canManageMembers && !isArchived}
          />
        </TabsContent>

        <TabsContent value="governance" className="flex min-h-0 flex-1 flex-col gap-3">
          <GovernancePanel
            scopeId={props.scopeId}
            scopeLabel={props.name}
            positionCatalog={props.positionCatalog}
            positionHolders={props.positionHolders}
            roleHolders={props.roleHolders}
            memberPicker={props.memberPicker}
            canManage={props.canManageGovernance}
            emptyCatalogHint="No position catalog exists for batches yet."
            emptyRolesHint="No roles granted at this batch yet."
          />
        </TabsContent>
      </Tabs>

      <BatchFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initial={{
          scopeId: props.scopeId,
          name: props.name,
          slug: props.slug,
          entryYear: props.entryYear,
          ordinal: props.ordinal,
          nickname: props.nickname,
          description: props.description,
          contactEmail: props.contactEmail,
          contactPhone: props.contactPhone,
        }}
      />

      <ConfirmDialog
        open={confirmArchive}
        title={`Archive ${props.name}?`}
        description="Archived batches disappear from every dropdown. Members currently attached keep their reference until an admin reassigns them."
        confirmLabel="Archive"
        onConfirm={() => {
          setConfirmArchive(false);
          doArchive();
        }}
        onCancel={() => setConfirmArchive(false)}
      />
    </div>
  );
}

// ─── Members tab ────────────────────────────────────────────────────

interface MembersTableProps {
  readonly batchScopeId: string;
  readonly batchSlug: string;
  readonly batchName: string;
  readonly entryYear: number;
  readonly members: readonly BatchMemberRow[];
  readonly houseOptions: readonly RefOption[];
  readonly networkOptions: readonly RefOption[];
  readonly canManageMembers: boolean;
}

type ConfirmDelete = null | {
  readonly kind: 'single' | 'bulk';
  readonly targets: readonly BatchMemberRow[];
};

function MembersTable(props: MembersTableProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<BatchMemberRow> | null>(null);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDelete>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return props.members;
    return props.members.filter((m) => {
      if (m.full_name.toLowerCase().includes(q)) return true;
      if (m.member_code.toLowerCase().includes(q)) return true;
      if (m.house_name.toLowerCase().includes(q)) return true;
      if (m.network_name.toLowerCase().includes(q)) return true;
      if (m.branch_name?.toLowerCase().includes(q)) return true;
      if (m.email?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [props.members, search]);

  const columnDefs = useMemo<ColDef<BatchMemberRow>[]>(
    () => [
      {
        headerName: 'Code',
        field: 'member_code',
        width: 160,
        cellClass: 'font-mono text-xs',
      },
      {
        headerName: 'Full name',
        field: 'full_name',
        flex: 2,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<BatchMemberRow, string>) =>
          p.data ? <MemberName name={p.data.full_name} badge={p.data.badge} /> : null,
      },
      { headerName: 'House', field: 'house_name', width: 140 },
      { headerName: 'Network', field: 'network_name', width: 160 },
      {
        headerName: 'Branch',
        field: 'branch_name',
        flex: 1.5,
        minWidth: 160,
        valueFormatter: (p) => p.value ?? '—',
      },
      {
        headerName: 'Membership',
        field: 'membership_status',
        width: 130,
        cellRenderer: (p: ICellRendererParams<BatchMemberRow, string | null>) => (
          <MembershipBadge status={p.value ?? null} />
        ),
      },
      {
        headerName: 'Location',
        field: 'location',
        flex: 2,
        minWidth: 180,
        valueFormatter: (p) => p.value ?? '—',
      },
    ],
    [],
  );

  const runDelete = (targets: readonly BatchMemberRow[]) => {
    startTransition(async () => {
      const results = await Promise.all(
        targets.map((t) =>
          deleteBatchMember({ memberId: t.member_id, batchSlug: props.batchSlug }),
        ),
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        toast.success(`Deleted ${targets.length} member${targets.length === 1 ? '' : 's'}.`);
      } else if (failed.length === targets.length) {
        toast.error(failed[0]?.message ?? 'Could not delete.');
      } else {
        toast.error(
          `Deleted ${targets.length - failed.length}; ${failed.length} still attached to a branch.`,
        );
      }
      router.refresh();
    });
  };

  const massActions = useMemo<MassActions<BatchMemberRow>>(
    () => ({
      itemName: 'member',
      pluralItemName: 'members',
      onDelete: (selected) => setConfirmDelete({ kind: 'bulk', targets: selected }),
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1" />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => router.refresh()}
          disabled={pending}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => gridApi?.exportDataAsCsv({ fileName: `${props.batchSlug}-members.csv` })}
          disabled={!gridApi}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'member' : 'members'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={props.canManageMembers}
        onCreate={() => setCreateOpen(true)}
        createLabel="Create Member"
        filters={
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!props.canManageMembers}
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Import Members
          </Button>
        }
      />

      <DataTable<BatchMemberRow>
        rowData={filtered as BatchMemberRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable={props.canManageMembers}
        massActions={massActions}
      />

      <CreateMemberDialog
        batchScopeId={props.batchScopeId}
        batchSlug={props.batchSlug}
        batchName={props.batchName}
        entryYear={props.entryYear}
        houses={props.houseOptions}
        networks={props.networkOptions}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <BatchImportDialog
        scope={{ id: props.batchScopeId, slug: props.batchSlug, name: props.batchName }}
        open={importOpen}
        onOpenChange={setImportOpen}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title={
          confirmDelete
            ? confirmDelete.kind === 'single'
              ? `Delete ${confirmDelete.targets[0]?.full_name ?? 'member'}?`
              : `Delete ${confirmDelete.targets.length} members?`
            : ''
        }
        description="Deletion is refused if the member is still attached to a branch. This action is not undoable — use it only for stray or duplicate records."
        confirmLabel="Delete"
        onConfirm={() => {
          if (!confirmDelete) return;
          const targets = confirmDelete.targets;
          setConfirmDelete(null);
          runDelete(targets);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function MembershipBadge({ status }: { readonly status: string | null }) {
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
