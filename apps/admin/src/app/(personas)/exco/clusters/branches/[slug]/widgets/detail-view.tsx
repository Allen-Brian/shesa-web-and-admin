'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Country } from 'country-state-city';
import { Archive, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';

import {
  Badge,
  BackLink,
  Button,
  ConfirmDialog,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EntityTablePanel,
  StatsCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type MassActions,
  type RowClickedEvent,
} from '@shesa/ui';

import type { ScopeStatus } from '@/components/clusters/cluster-list';
import type { ExcoBadgeInfo } from '@/components/governance/exco-badge';
import { MemberName } from '@/components/governance/member-name';
import { GovernancePanel } from '@/components/governance/governance-panel';
import type {
  GovernancePositionCatalogRow,
  GovernancePositionHolderRow,
  GovernanceRoleHolderRow,
} from '@/components/governance/governance-panel';
import type { GovernanceMemberPickerRow as SharedGovernanceMemberPickerRow } from '@/components/governance/assign-position-dialog';

import { archiveBranch } from '../../actions';
import { archiveChapter } from '../../chapter-actions';
import type { ChapterInitialValues } from '../../widgets/chapter-form';
import { BranchFormDialog } from '../../widgets/branch-form-dialog';
import { ChapterFormDialog } from '../../widgets/chapter-form-dialog';

export interface BranchChapterRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: ScopeStatus;
  readonly chapter_kind: 'autonomous' | 'grouping';
  readonly region: string;
  readonly city: string;
  readonly contact_email: string | null;
  readonly member_count: number;
}

export interface BranchMemberRow {
  readonly id: string;
  readonly member_id: string;
  readonly full_name: string;
  readonly badge: ExcoBadgeInfo | null;
  readonly batch_year: number | null;
  readonly network_name: string;
  readonly house_name: string;
  readonly membership_status: 'active' | 'passive' | 'pending';
  readonly location: string | null;
}

export type PositionCatalogRow = GovernancePositionCatalogRow;
export type PositionHolderRow = GovernancePositionHolderRow;
export type RoleHolderRow = GovernanceRoleHolderRow;
export type GovernanceMemberPickerRow = SharedGovernanceMemberPickerRow;

interface BranchDetailViewProps {
  readonly scopeId: string;
  readonly name: string;
  readonly slug: string;
  readonly status: ScopeStatus;
  readonly currencyCode: string;
  readonly countryCode: string;
  readonly region: string;
  readonly city: string;
  readonly nickname: string | null;
  readonly description: string | null;
  readonly registrationFeeRequired: boolean;
  readonly registrationFeeAmount: number | null;
  readonly registrationFeeCurrency: string | null;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
  readonly memberCount: number;
  readonly chapterCount: number;
  readonly autonomousChapterCount: number;
  readonly chapters: readonly BranchChapterRow[];
  readonly members: readonly BranchMemberRow[];
  readonly positionCatalog: readonly PositionCatalogRow[];
  readonly positionHolders: readonly PositionHolderRow[];
  readonly roleHolders: readonly RoleHolderRow[];
  readonly memberPicker: readonly GovernanceMemberPickerRow[];
  readonly canUpdate: boolean;
  readonly canManageGovernance: boolean;
}

export function BranchDetailView(props: BranchDetailViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newChapterOpen, setNewChapterOpen] = useState(false);

  const country = props.countryCode ? (Country.getCountryByCode(props.countryCode) ?? null) : null;
  const isArchived = props.status === 'archived';

  const doArchive = () => {
    startTransition(async () => {
      const result = await archiveBranch(props.scopeId);
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
      <BackLink href="/exco/clusters/branches" label="Back to branches" />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{props.name}</h1>
        <p className="text-sm text-muted-foreground">
          {country?.name ?? (props.countryCode || '—')}
          {props.region ? ` · ${props.region}` : ''}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Branch members" value={props.memberCount} />
        <StatsCard label="Chapters" value={props.chapterCount} />
        <StatsCard label="Autonomous chapters" value={props.autonomousChapterCount} />
        <StatsCard
          label="Registration fee"
          value={
            props.registrationFeeRequired && props.registrationFeeAmount != null
              ? `${props.registrationFeeAmount} ${props.registrationFeeCurrency ?? props.currencyCode}`
              : '—'
          }
        />
      </div>

      <Tabs defaultValue="members" className="flex min-h-0 flex-1 flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="chapters">
              Chapters
              <span className="ml-1.5 text-xs text-muted-foreground">({props.chapterCount})</span>
            </TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
            <TabsTrigger value="page">Page</TabsTrigger>
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
                  onClick={() => setConfirmOpen(true)}
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
          <MembersTable members={props.members} />
        </TabsContent>

        <TabsContent value="chapters" className="flex min-h-0 flex-1 flex-col gap-3">
          <ChaptersTab
            branchId={props.scopeId}
            branchSlug={props.slug}
            branchName={props.name}
            branchGeography={{
              countryCode: props.countryCode,
              region: props.region,
              city: props.city,
              currencyCode: props.currencyCode,
            }}
            chapters={props.chapters}
            canCreate={props.canUpdate}
            onOpenNew={() => setNewChapterOpen(true)}
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
            emptyCatalogHint="No position catalog exists for branches yet."
            emptyRolesHint="No roles granted at this branch yet."
          />
        </TabsContent>

        <TabsContent value="page">
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Public branch page + branding land in the Phase 5 CMS work.
          </div>
        </TabsContent>
      </Tabs>

      <BranchFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initial={{
          scopeId: props.scopeId,
          name: props.name,
          slug: props.slug,
          nickname: props.nickname,
          description: props.description,
          countryCode: props.countryCode,
          region: props.region,
          city: props.city,
          currencyCode: props.currencyCode,
          registrationFeeRequired: props.registrationFeeRequired,
          registrationFeeAmount: props.registrationFeeAmount,
          registrationFeeCurrency: props.registrationFeeCurrency,
          contactEmail: props.contactEmail,
          contactPhone: props.contactPhone,
        }}
      />

      <ChapterFormDialog
        open={newChapterOpen}
        onOpenChange={setNewChapterOpen}
        mode="create"
        initial={{
          parentBranchId: props.scopeId,
          parentBranchName: props.name,
          parentGeography: {
            countryCode: props.countryCode,
            region: props.region,
            city: props.city,
            currencyCode: props.currencyCode,
          },
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={`Archive ${props.name}?`}
        description="Archived branches disappear from every dropdown. Members currently attached keep their reference until an admin reassigns them."
        confirmLabel="Archive"
        onConfirm={() => {
          setConfirmOpen(false);
          doArchive();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function MembersTable({ members }: { readonly members: readonly BranchMemberRow[] }) {
  const [gridApi, setGridApi] = useState<GridApi<BranchMemberRow> | null>(null);
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      if (m.full_name.toLowerCase().includes(q)) return true;
      if (m.batch_year && String(m.batch_year).includes(q)) return true;
      if (m.network_name.toLowerCase().includes(q)) return true;
      if (m.house_name.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [members, search]);

  const columnDefs = useMemo<ColDef<BranchMemberRow>[]>(
    () => [
      {
        headerName: 'Full name',
        field: 'full_name',
        flex: 2,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<BranchMemberRow, string>) =>
          p.data ? <MemberName name={p.data.full_name} badge={p.data.badge} /> : null,
      },
      {
        headerName: 'Batch',
        field: 'batch_year',
        width: 100,
        valueFormatter: (p) => (p.value == null ? '—' : String(p.value)),
      },
      { headerName: 'House', field: 'house_name', width: 140 },
      { headerName: 'Network', field: 'network_name', width: 160 },
      {
        headerName: 'Membership',
        field: 'membership_status',
        width: 130,
        cellRenderer: (p: ICellRendererParams<BranchMemberRow, string>) => (
          <MembershipBadge status={p.value ?? null} />
        ),
      },
      {
        headerName: 'Location',
        field: 'location',
        flex: 2,
        minWidth: 200,
        valueFormatter: (p) => p.value ?? '—',
      },
    ],
    [],
  );

  return (
    <>
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
      <DataTable<BranchMemberRow>
        rowData={filtered as BranchMemberRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable={false}
      />
    </>
  );
}

type ChapterSerialRow = BranchChapterRow & { readonly serial: number };

type ChapterConfirm = null | {
  readonly kind: 'archive' | 'delete';
  readonly targets: readonly ChapterSerialRow[];
};

function ChaptersTab({
  branchId,
  branchSlug,
  branchName,
  branchGeography,
  chapters,
  canCreate,
  onOpenNew,
}: {
  readonly branchId: string;
  readonly branchSlug: string;
  readonly branchName: string;
  readonly branchGeography: {
    readonly countryCode: string;
    readonly region: string;
    readonly city: string;
    readonly currencyCode: string;
  };
  readonly chapters: readonly BranchChapterRow[];
  readonly canCreate: boolean;
  readonly onOpenNew: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [gridApi, setGridApi] = useState<GridApi<ChapterSerialRow> | null>(null);
  const [search, setSearch] = useState('');
  const [editChapter, setEditChapter] = useState<ChapterInitialValues | null>(null);
  const [confirm, setConfirm] = useState<ChapterConfirm>(null);

  const numbered = useMemo<readonly ChapterSerialRow[]>(
    () => chapters.map((c, i) => ({ ...c, serial: i + 1 })),
    [chapters],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return numbered;
    return numbered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q),
    );
  }, [numbered, search]);

  const openEdit = (row: ChapterSerialRow) =>
    setEditChapter({
      scopeId: row.id,
      parentBranchId: branchId,
      parentBranchName: branchName,
      chapterKind: row.chapter_kind,
      name: row.name,
      slug: row.slug,
      nickname: null,
      description: null,
      countryCode: branchGeography.countryCode,
      region: row.region,
      city: row.city,
      currencyCode: branchGeography.currencyCode,
      registrationFeeRequired: false,
      registrationFeeAmount: null,
      registrationFeeCurrency: null,
      contactEmail: row.contact_email,
      contactPhone: null,
    });

  const runArchive = (targets: readonly ChapterSerialRow[], kind: 'archive' | 'delete') => {
    startTransition(async () => {
      const results = await Promise.all(targets.map((t) => archiveChapter(t.id)));
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        toast.success(
          `${kind === 'archive' ? 'Archived' : 'Deleted'} ${targets.length} chapter${
            targets.length === 1 ? '' : 's'
          }.`,
        );
      } else if (failed.length === targets.length) {
        toast.error(failed[0]?.message ?? `Could not ${kind}.`);
      } else {
        toast.error(
          `${kind === 'archive' ? 'Archived' : 'Deleted'} ${targets.length - failed.length}; ${failed.length} failed.`,
        );
      }
      router.refresh();
    });
  };

  const columnDefs = useMemo<ColDef<ChapterSerialRow>[]>(
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
      { headerName: 'Chapter', field: 'name', flex: 2, minWidth: 200 },
      {
        headerName: 'Kind',
        field: 'chapter_kind',
        width: 140,
        cellRenderer: (p: ICellRendererParams<ChapterSerialRow, string>) => (
          <KindText kind={p.value === 'autonomous' ? 'autonomous' : 'grouping'} />
        ),
      },
      { headerName: 'Region', field: 'region', flex: 1, minWidth: 140 },
      { headerName: 'City', field: 'city', flex: 1, minWidth: 130 },
      {
        headerName: 'Members',
        field: 'member_count',
        width: 150,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        headerClass: 'ag-center-aligned-header',
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        width: 100,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<ChapterSerialRow>) =>
          p.data ? (
            <ChapterRowActions
              row={p.data}
              onEdit={openEdit}
              onArchive={(r) => setConfirm({ kind: 'archive', targets: [r] })}
              onDelete={(r) => setConfirm({ kind: 'delete', targets: [r] })}
            />
          ) : null,
      },
    ],
    [],
  );

  const handleRowClicked = (e: RowClickedEvent<ChapterSerialRow>) => {
    if (!e.data) return;
    router.push(`/exco/clusters/branches/${branchSlug}/chapters/${e.data.slug}`);
  };

  const massActions = useMemo<MassActions<ChapterSerialRow>>(
    () => ({
      itemName: 'chapter',
      pluralItemName: 'chapters',
      onArchive: (selected) => setConfirm({ kind: 'archive', targets: selected }),
      onDelete: (selected) => setConfirm({ kind: 'delete', targets: selected }),
    }),
    [],
  );

  return (
    <>
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'chapter' : 'chapters'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={canCreate}
        createLabel="New Chapter"
        onCreate={onOpenNew}
      />
      {chapters.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <p>No chapters yet under {branchName}.</p>
          {canCreate && (
            <Button asChild size="sm" variant="outline">
              <button type="button" onClick={onOpenNew}>
                <Plus className="h-4 w-4" />
                Add the first chapter
              </button>
            </Button>
          )}
        </div>
      ) : (
        <DataTable<ChapterSerialRow>
          rowData={filtered as ChapterSerialRow[]}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          onGridReady={(e) => setGridApi(e.api)}
          onRowClicked={handleRowClicked}
          showColumnPicker={false}
          massActions={massActions}
        />
      )}

      {editChapter && (
        <ChapterFormDialog
          open
          onOpenChange={(o) => {
            if (!o) setEditChapter(null);
          }}
          mode="edit"
          initial={editChapter}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirmChapterTitle(confirm)}
        description="Archived chapters disappear from every dropdown. Existing memberships keep resolving."
        confirmLabel={confirm?.kind === 'delete' ? 'Delete' : 'Archive'}
        onConfirm={() => {
          if (!confirm) return;
          const { kind, targets } = confirm;
          setConfirm(null);
          runArchive(targets, kind);
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

function confirmChapterTitle(c: ChapterConfirm): string {
  if (!c) return '';
  const verb = c.kind === 'delete' ? 'Delete' : 'Archive';
  if (c.targets.length === 1) return `${verb} ${c.targets[0]?.name ?? 'this chapter'}?`;
  return `${verb} ${c.targets.length} chapters?`;
}

function KindText({ kind }: { readonly kind: 'autonomous' | 'grouping' }) {
  const isAuto = kind === 'autonomous';
  return (
    <span className={isAuto ? 'font-medium text-primary' : 'text-muted-foreground'}>
      {isAuto ? 'Autonomous' : 'Grouping'}
    </span>
  );
}

function ChapterRowActions({
  row,
  onEdit,
  onArchive,
  onDelete,
}: {
  readonly row: ChapterSerialRow;
  readonly onEdit: (row: ChapterSerialRow) => void;
  readonly onArchive: (row: ChapterSerialRow) => void;
  readonly onDelete: (row: ChapterSerialRow) => void;
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
        <DropdownMenuItem onClick={() => onEdit(row)}>
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onArchive(row)}>
          <Archive className="h-4 w-4" />
          Archive
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(row)}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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

// Retained to satisfy the eslint no-unused-vars on the imported Link.
void Link;
