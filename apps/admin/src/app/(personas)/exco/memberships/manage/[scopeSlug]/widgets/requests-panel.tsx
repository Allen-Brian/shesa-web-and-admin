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

import { approveJoinRequest, rejectJoinRequest } from '../../../join-transfer-actions';
import { buildRequestColumns } from './requests-columns';
import type { RequestRow } from './switcher';

interface RequestsPanelProps {
  readonly requests: readonly RequestRow[];
  readonly scopeSlug: string;
}

type SerialRow = RequestRow & { readonly serial: number };

type ConfirmState =
  | null
  | { readonly kind: 'reject'; readonly targets: readonly RequestRow[] }
  | { readonly kind: 'bulkApprove'; readonly targets: readonly RequestRow[] };

/**
 * Requests panel — selectable table with mass actions for bulk
 * approve / reject. Row-click opens the member profile.
 */
export function RequestsPanel({ requests, scopeSlug }: RequestsPanelProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [pending, startTransition] = useTransition();

  const numbered = useMemo<readonly SerialRow[]>(
    () => requests.map((r, i) => ({ ...r, serial: i + 1 })),
    [requests],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return numbered;
    return numbered.filter((r) => {
      if (r.full_name.toLowerCase().includes(q)) return true;
      if (r.batch_name?.toLowerCase().includes(q)) return true;
      if (r.email?.toLowerCase().includes(q)) return true;
      if (r.phone?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [numbered, search]);

  const runApprove = (rows: readonly RequestRow[]) => {
    startTransition(async () => {
      const results = await Promise.all(rows.map((r) => approveJoinRequest(r.membership_id)));
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        toast.success(`${rows.length} request${rows.length === 1 ? '' : 's'} approved.`);
      } else if (failed.length === rows.length) {
        toast.error(failed[0]?.ok === false ? failed[0].message : 'Could not approve.');
      } else {
        toast.error(`Approved ${rows.length - failed.length}; ${failed.length} failed.`);
      }
      router.refresh();
    });
  };

  const runReject = (rows: readonly RequestRow[]) => {
    startTransition(async () => {
      const results = await Promise.all(rows.map((r) => rejectJoinRequest(r.membership_id)));
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        toast.success(`${rows.length} request${rows.length === 1 ? '' : 's'} rejected.`);
      } else if (failed.length === rows.length) {
        toast.error(failed[0]?.ok === false ? failed[0].message : 'Could not reject.');
      } else {
        toast.error(`Rejected ${rows.length - failed.length}; ${failed.length} failed.`);
      }
      router.refresh();
    });
  };

  const columnDefs = useMemo(
    () =>
      buildRequestColumns({
        pending,
        onApprove: (row) => runApprove([row]),
        onReject: (row) => setConfirm({ kind: 'reject', targets: [row] }),
      }),
    [pending],
  );

  const massActions = useMemo<MassActions<SerialRow>>(
    () => ({
      itemName: 'request',
      pluralItemName: 'requests',
      custom: [
        {
          label: 'Approve',
          onClick: (selected: SerialRow[]) =>
            setConfirm({ kind: 'bulkApprove', targets: selected }),
        },
        {
          label: 'Reject',
          onClick: (selected: SerialRow[]) => setConfirm({ kind: 'reject', targets: selected }),
          destructive: true,
        },
      ],
    }),
    [],
  );

  const onRowClicked = (e: RowClickedEvent<SerialRow>) => {
    if (!e.data) return;
    router.push(`/exco/memberships/members/${scopeSlug}/${e.data.member_id}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'request' : 'requests'}
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
        getRowId={(p) => p.data.membership_id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={onRowClicked}
        showColumnPicker={false}
        selectable
        massActions={massActions}
      />

      <ConfirmDialog
        open={confirm?.kind === 'reject'}
        title={
          confirm?.kind === 'reject'
            ? confirm.targets.length === 1
              ? `Reject ${confirm.targets[0]?.full_name}?`
              : `Reject ${confirm.targets.length} requests?`
            : ''
        }
        description="The request is closed and the pending membership row is left behind. The member is notified and can re-request later."
        confirmLabel="Reject"
        onConfirm={() => {
          if (confirm?.kind !== 'reject') return;
          const targets = confirm.targets;
          setConfirm(null);
          runReject(targets);
        }}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm?.kind === 'bulkApprove'}
        title={confirm?.kind === 'bulkApprove' ? `Approve ${confirm.targets.length} requests?` : ''}
        description="Each pending membership is opened as active. Registration state is seeded from the branch's fee config."
        confirmLabel="Approve"
        onConfirm={() => {
          if (confirm?.kind !== 'bulkApprove') return;
          const targets = confirm.targets;
          setConfirm(null);
          runApprove(targets);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
