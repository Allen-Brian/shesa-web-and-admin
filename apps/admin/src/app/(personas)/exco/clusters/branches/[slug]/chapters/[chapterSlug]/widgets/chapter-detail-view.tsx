'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Country } from 'country-state-city';
import { Archive, ArrowLeftRight, Pencil } from 'lucide-react';

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
} from '@shesa/ui';

import type { ScopeStatus } from '@/components/clusters/cluster-list';

import { archiveChapter, changeChapterAutonomy } from '../../../../chapter-actions';
import type { ChapterInitialValues } from '../../../../widgets/chapter-form';
import { ChapterFormDialog } from '../../../../widgets/chapter-form-dialog';
import type { ExcoBadgeInfo } from '@/components/governance/exco-badge';
import { MemberName } from '@/components/governance/member-name';
import {
  GovernancePanel,
  type GovernancePositionCatalogRow,
  type GovernancePositionHolderRow,
  type GovernanceRoleHolderRow,
} from '@/components/governance/governance-panel';
import type { GovernanceMemberPickerRow } from '@/components/governance/assign-position-dialog';

export interface ChapterMemberRow {
  readonly id: string;
  readonly member_id: string;
  readonly full_name: string;
  readonly badge: ExcoBadgeInfo | null;
  readonly batch_year: number | null;
  readonly house_name: string;
  readonly network_name: string;
  readonly membership_status: 'active' | 'passive' | 'pending';
  readonly location: string | null;
}

interface ChapterDetailViewProps {
  readonly branchId: string;
  readonly branchSlug: string;
  readonly branchName: string;
  readonly chapterId: string;
  readonly name: string;
  readonly slug: string;
  readonly status: ScopeStatus;
  readonly chapterKind: 'autonomous' | 'grouping';
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
  readonly members: readonly ChapterMemberRow[];
  readonly positionCatalog: readonly GovernancePositionCatalogRow[];
  readonly positionHolders: readonly GovernancePositionHolderRow[];
  readonly roleHolders: readonly GovernanceRoleHolderRow[];
  readonly memberPicker: readonly GovernanceMemberPickerRow[];
  readonly canUpdate: boolean;
  readonly canChangeAutonomy: boolean;
  readonly canManageGovernance: boolean;
}

export function ChapterDetailView(props: ChapterDetailViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDemote, setConfirmDemote] = useState(false);
  const [confirmPromote, setConfirmPromote] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const country = props.countryCode ? Country.getCountryByCode(props.countryCode) : null;
  const isAutonomous = props.chapterKind === 'autonomous';
  const isArchived = props.status === 'archived';

  const doArchive = () => {
    startTransition(async () => {
      const result = await archiveChapter(props.chapterId);
      if (!result.ok) {
        toast.error(result.message ?? 'Could not archive.');
        return;
      }
      toast.success(`${props.name} archived.`);
      router.refresh();
    });
  };

  const doChangeKind = (nextKind: 'autonomous' | 'grouping') => {
    startTransition(async () => {
      const result = await changeChapterAutonomy(props.chapterId, nextKind);
      if (!result.ok) {
        toast.error(result.message ?? 'Could not change kind.');
        return;
      }
      toast.success(
        nextKind === 'autonomous'
          ? `${props.name} promoted to autonomous.`
          : `${props.name} demoted to grouping.`,
      );
      router.refresh();
    });
  };

  const initialForEdit: ChapterInitialValues = {
    scopeId: props.chapterId,
    parentBranchId: props.branchId,
    parentBranchName: props.branchName,
    chapterKind: props.chapterKind,
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
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <BackLink
        href={`/exco/clusters/branches/${props.branchSlug}`}
        label={`Back to ${props.branchName}`}
      />

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{props.name}</h1>
          <span
            className={
              isAutonomous ? 'text-sm font-medium text-primary' : 'text-sm text-muted-foreground'
            }
          >
            {isAutonomous ? 'Autonomous' : 'Grouping'}
          </span>
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
          {country?.name ?? (props.countryCode || '—')}
          {props.region ? ` · ${props.region}` : ''}
        </p>
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
              {props.canChangeAutonomy && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={pending}
                  disabled={pending}
                  onClick={() => (isAutonomous ? setConfirmDemote(true) : setConfirmPromote(true))}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  {isAutonomous ? 'Demote' : 'Promote'}
                </Button>
              )}
              {!isArchived && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={pending}
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
          {isAutonomous ? (
            <MembersTable members={props.members} />
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Grouping chapter.</strong> Members stay attached
                to <strong className="text-foreground">{props.branchName}</strong>; tag-based
                membership lands with the member-management epic.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="governance" className="flex min-h-0 flex-1 flex-col gap-3">
          {isAutonomous ? (
            <GovernancePanel
              scopeId={props.chapterId}
              scopeLabel={props.name}
              scopeType="chapter"
              positionCatalog={props.positionCatalog}
              positionHolders={props.positionHolders}
              roleHolders={props.roleHolders}
              memberPicker={props.memberPicker}
              canManage={props.canManageGovernance}
              canCreatePositions={props.canManageGovernance}
              emptyCatalogHint="No position catalog exists for chapters yet."
              emptyRolesHint="No roles granted at this chapter yet."
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Grouping chapter.</strong> Governance is
                inherited from <strong className="text-foreground">{props.branchName}</strong>.
                Promote this chapter to autonomous first to give it its own positions and portal
                access.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ChapterFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initial={initialForEdit}
      />

      <ConfirmDialog
        open={confirmArchive}
        title={`Archive ${props.name}?`}
        description="Archived chapters disappear from every dropdown. Existing memberships keep resolving."
        confirmLabel="Archive"
        onConfirm={() => {
          setConfirmArchive(false);
          doArchive();
        }}
        onCancel={() => setConfirmArchive(false)}
      />

      <ConfirmDialog
        open={confirmDemote}
        title={`Demote ${props.name} to grouping?`}
        description="The chapter becomes a tag under its parent branch. This is blocked if any members are still attached — reassign them first."
        confirmLabel="Demote"
        onConfirm={() => {
          setConfirmDemote(false);
          doChangeKind('grouping');
        }}
        onCancel={() => setConfirmDemote(false)}
      />

      <ConfirmDialog
        open={confirmPromote}
        title={`Promote ${props.name} to autonomous?`}
        description="The chapter gains its own currency, registration tracking, and treasury. Edit the chapter afterwards to fill in the finance fields."
        confirmLabel="Promote"
        onConfirm={() => {
          setConfirmPromote(false);
          doChangeKind('autonomous');
        }}
        onCancel={() => setConfirmPromote(false)}
      />
    </div>
  );
}

function MembersTable({ members }: { readonly members: readonly ChapterMemberRow[] }) {
  const [gridApi, setGridApi] = useState<GridApi<ChapterMemberRow> | null>(null);
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.full_name.toLowerCase().includes(q));
  }, [members, search]);

  const columnDefs = useMemo<ColDef<ChapterMemberRow>[]>(
    () => [
      {
        headerName: 'Full name',
        field: 'full_name',
        flex: 2,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<ChapterMemberRow, string>) =>
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
        cellRenderer: (p: ICellRendererParams<ChapterMemberRow, string>) => (
          <MembershipBadge status={p.value ?? null} />
        ),
      },
    ],
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
        canCreate={false}
        hideCreate
        createLabel=""
        onCreate={() => undefined}
      />
      <DataTable<ChapterMemberRow>
        rowData={filtered as ChapterMemberRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable={false}
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
