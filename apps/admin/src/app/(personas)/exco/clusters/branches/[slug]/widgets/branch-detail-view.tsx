'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Country } from 'country-state-city';

import {
  BackLink,
  ConfirmDialog,
  StatsCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@shesa/ui';

import { GovernancePanel } from '@/components/governance/governance-panel';
import type { ScopeStatus } from '@/components/clusters/cluster-list';

import { archiveBranch, restoreBranch } from '../../branch-actions';
import { BranchFormDialog } from '../../widgets/branch-form-dialog';
import { ChapterFormDialog } from '../../widgets/chapter-form-dialog';
import { BranchChaptersTab } from './branch-chapters-tab';
import { BranchDetailToolbar } from './branch-detail-toolbar';
import { BranchMemberImportDialog } from './branch-member-import-dialog';
import { BranchMembersTable } from './branch-members-table';
import { exportBranchMembersCsv } from './branch-members-export';
import type {
  BranchChapterRow,
  BranchMemberRow,
  GovernanceMemberPickerRow,
  PositionCatalogRow,
  PositionHolderRow,
  RoleHolderRow,
} from './branch-detail-types';

export type {
  BranchChapterRow,
  BranchMemberRow,
  GovernanceMemberPickerRow,
  PositionCatalogRow,
  PositionHolderRow,
  RoleHolderRow,
} from './branch-detail-types';

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

/**
 * Branch detail page — top strip with stats + edit/archive controls,
 * three tabs (Members / Chapters / Governance), and a family of
 * dialogs (edit branch, new chapter, confirm archive/restore, member
 * import). Every sub-surface lives in its own file per the
 * one-per-file rule.
 */
export function BranchDetailView(props: BranchDetailViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmMode, setConfirmMode] = useState<'archive' | 'restore' | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
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

  const doRestore = () => {
    startTransition(async () => {
      const result = await restoreBranch(props.scopeId);
      if (!result.ok) {
        toast.error(result.message ?? 'Could not restore.');
        return;
      }
      toast.success(`${props.name} restored.`);
      router.refresh();
    });
  };

  const handleRefresh = () => {
    router.refresh();
    toast.success('Refreshed');
  };

  const handleExport = () => {
    const count = exportBranchMembersCsv(props.slug, props.members);
    if (count === 0) {
      toast.error('No members to export.');
      return;
    }
    toast.success(`Exported ${count} member${count === 1 ? '' : 's'}.`);
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
          </TabsList>
          <BranchDetailToolbar
            canUpdate={props.canUpdate}
            isArchived={isArchived}
            pending={pending}
            onRefresh={handleRefresh}
            onImport={() => setImportOpen(true)}
            onExport={handleExport}
            onEdit={() => setEditOpen(true)}
            onArchive={() => setConfirmMode('archive')}
            onRestore={() => setConfirmMode('restore')}
          />
        </div>

        <TabsContent value="members" className="flex min-h-0 flex-1 flex-col gap-3">
          <BranchMembersTable members={props.members} />
        </TabsContent>

        <TabsContent value="chapters" className="flex min-h-0 flex-1 flex-col gap-3">
          <BranchChaptersTab
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
            scopeType="branch"
            positionCatalog={props.positionCatalog}
            positionHolders={props.positionHolders}
            roleHolders={props.roleHolders}
            memberPicker={props.memberPicker}
            canManage={props.canManageGovernance}
            canCreatePositions={props.canManageGovernance}
            emptyCatalogHint="No position catalog exists for branches yet."
            emptyRolesHint="No roles granted at this branch yet."
          />
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
        open={confirmMode !== null}
        title={confirmMode === 'restore' ? `Restore ${props.name}?` : `Archive ${props.name}?`}
        description={
          confirmMode === 'restore'
            ? 'The branch will return to the active list and become available in dropdowns again.'
            : 'Archived branches disappear from every dropdown. Members currently attached keep their reference until an admin reassigns them. Restore later from this same menu.'
        }
        confirmLabel={confirmMode === 'restore' ? 'Restore' : 'Archive'}
        onConfirm={() => {
          const mode = confirmMode;
          setConfirmMode(null);
          if (mode === 'restore') doRestore();
          else if (mode === 'archive') doArchive();
        }}
        onCancel={() => setConfirmMode(null)}
      />

      <BranchMemberImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        scope={{ id: props.scopeId, slug: props.slug, name: props.name }}
      />
    </div>
  );
}
