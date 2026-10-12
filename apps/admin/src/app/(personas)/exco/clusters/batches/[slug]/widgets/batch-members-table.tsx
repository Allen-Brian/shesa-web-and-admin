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
} from '@shesa/ui';

import { deleteBatchMember } from '../../batch-member-actions';

import { buildBatchMembersColumns } from './batch-members-columns';
import type { BatchMemberRow, BatchMembersConfirmDelete, RefOption } from './batch-detail-types';
import { CreateMemberDialog } from './create-member-dialog';

interface BatchMembersTableProps {
  readonly batchScopeId: string;
  readonly batchSlug: string;
  readonly batchName: string;
  readonly entryYear: number;
  readonly members: readonly BatchMemberRow[];
  readonly houseOptions: readonly RefOption[];
  readonly networkOptions: readonly RefOption[];
  readonly canManageMembers: boolean;
}

/**
 * Members-tab table for a batch. Filterable by search across name /
 * code / house / network / branch / email. Bulk-delete supported when
 * the viewer can manage members — delete is refused server-side if any
 * targeted member is still attached to a branch.
 */
export function BatchMembersTable(props: BatchMembersTableProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<BatchMemberRow> | null>(null);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<BatchMembersConfirmDelete>(null);
  const [, startTransition] = useTransition();

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

  const columnDefs = useMemo(() => buildBatchMembersColumns(), []);

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
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'member' : 'members'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={props.canManageMembers}
        onCreate={() => setCreateOpen(true)}
        createLabel="Create Member"
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
