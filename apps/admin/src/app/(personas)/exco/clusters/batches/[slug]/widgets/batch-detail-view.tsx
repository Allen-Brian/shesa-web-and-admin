'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  BackLink,
  ConfirmDialog,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@shesa/ui';

import type { ScopeStatus } from '@/components/clusters/cluster-list';
import {
  GovernancePanel,
  type GovernancePositionCatalogRow,
  type GovernancePositionHolderRow,
  type GovernanceRoleHolderRow,
} from '@/components/governance/governance-panel';
import type { GovernanceMemberPickerRow } from '@/components/governance/assign-position-dialog';
import { formatOrdinal } from '@/lib/batches/ordinal';

import { archiveBatch, restoreBatch } from '../../batch-actions';
import { BatchFormDialog } from '../../widgets/form-dialog';
import { BatchDetailHeader } from './batch-detail-header';
import { exportBatchMembersCsv } from './batch-detail-helpers';
import { BatchDetailToolbar } from './batch-detail-toolbar';
import { BatchImportDialog } from './batch-import-dialog';
import { BatchMembersTable } from './batch-members-table';
import type { BatchMemberRow, RefOption } from './batch-detail-types';

export type { BatchMemberRow } from './batch-detail-types';

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

/**
 * Batch detail page shell — header + Members/Governance tab pair. Every
 * self-contained sub-block (header card, toolbar, members table, dialogs)
 * lives in its own file; this file owns state that spans them (edit /
 * import / archive confirm dialogs, in-flight transitions).
 */
export function BatchDetailView(props: BatchDetailViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmMode, setConfirmMode] = useState<'archive' | 'restore' | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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

  const doRestore = () => {
    startTransition(async () => {
      const result = await restoreBatch(props.scopeId);
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
    const count = exportBatchMembersCsv({ rows: props.members, slug: props.slug });
    if (count === 0) {
      toast.error('No members to export.');
      return;
    }
    toast.success(`Exported ${count} member${count === 1 ? '' : 's'}.`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <BackLink href="/exco/clusters/batches" label="Back to batches" />

      <BatchDetailHeader
        name={props.name}
        nickname={props.nickname}
        ordinalLabel={ordinalLabel}
        isArchived={isArchived}
        entryYear={props.entryYear}
        description={props.description}
        memberCount={props.memberCount}
      />

      <Tabs defaultValue="members" className="flex min-h-0 flex-1 flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
          </TabsList>
          <BatchDetailToolbar
            isArchived={isArchived}
            canManageMembers={props.canManageMembers}
            canUpdate={props.canUpdate}
            pending={pending}
            onRefresh={handleRefresh}
            onOpenImport={() => setImportOpen(true)}
            onExport={handleExport}
            onOpenEdit={() => setEditOpen(true)}
            onOpenArchive={() => setConfirmMode('archive')}
            onOpenRestore={() => setConfirmMode('restore')}
          />
        </div>

        <TabsContent value="members" className="flex min-h-0 flex-1 flex-col gap-3">
          <BatchMembersTable
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
            scopeType="batch"
            positionCatalog={props.positionCatalog}
            positionHolders={props.positionHolders}
            roleHolders={props.roleHolders}
            memberPicker={props.memberPicker}
            canManage={props.canManageGovernance}
            canCreatePositions={props.canManageGovernance}
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
        open={confirmMode !== null}
        title={confirmMode === 'restore' ? `Restore ${props.name}?` : `Archive ${props.name}?`}
        description={
          confirmMode === 'restore'
            ? 'The batch will return to the active list and become available in dropdowns again.'
            : 'Archived batches disappear from every dropdown. Members currently attached keep their reference until an admin reassigns them. Restore later from this same menu.'
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

      <BatchImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        scope={{ id: props.scopeId, slug: props.slug, name: props.name }}
      />
    </div>
  );
}
