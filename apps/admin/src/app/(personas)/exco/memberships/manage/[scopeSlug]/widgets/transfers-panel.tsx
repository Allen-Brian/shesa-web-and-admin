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

import { approveTransfer } from '../../../join-transfer-actions';
import type { TransferRow } from './switcher';
import { buildTransferColumns } from './transfers-columns';

interface TransfersPanelProps {
  readonly transfers: readonly TransferRow[];
  readonly scopeSlug: string;
}

type SerialRow = TransferRow & { readonly serial: number };

type ConfirmState =
  | null
  | { readonly kind: 'deny'; readonly targets: readonly TransferRow[] }
  | { readonly kind: 'bulkApprove'; readonly targets: readonly TransferRow[] };

/**
 * Incoming transfers panel (destination view). Selectable table with
 * bulk approve/deny. Per the M1 flip: approve fires
 * memberships/approve-transfer against the destination scope; the
 * source-scope admin is notified after. Deny is stubbed pending its
 * Edge Function.
 */
export function TransfersPanel({ transfers, scopeSlug }: TransfersPanelProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [pending, startTransition] = useTransition();

  const numbered = useMemo<readonly SerialRow[]>(
    () => transfers.map((r, i) => ({ ...r, serial: i + 1 })),
    [transfers],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return numbered;
    return numbered.filter((r) => {
      if (r.full_name.toLowerCase().includes(q)) return true;
      if (r.batch_name?.toLowerCase().includes(q)) return true;
      if (r.email?.toLowerCase().includes(q)) return true;
      if (r.source_scope_name.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [numbered, search]);

  const runApprove = (rows: readonly TransferRow[]) => {
    startTransition(async () => {
      const results = await Promise.all(rows.map((r) => approveTransfer(r.transfer_id)));
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        toast.success(`${rows.length} transfer${rows.length === 1 ? '' : 's'} approved.`);
      } else if (failed.length === rows.length) {
        toast.error(failed[0]?.ok === false ? failed[0].message : 'Could not approve.');
      } else {
        toast.error(`Approved ${rows.length - failed.length}; ${failed.length} failed.`);
      }
      router.refresh();
    });
  };

  const runDeny = () => {
    toast.warning('Transfer denial is not implemented yet.');
  };

  const columnDefs = useMemo(
    () =>
      buildTransferColumns({
        pending,
        onApprove: (row) => runApprove([row]),
        onDeny: (row) => setConfirm({ kind: 'deny', targets: [row] }),
      }),
    [pending],
  );

  const massActions = useMemo<MassActions<SerialRow>>(
    () => ({
      itemName: 'transfer',
      pluralItemName: 'transfers',
      custom: [
        {
          label: 'Approve',
          onClick: (selected: SerialRow[]) =>
            setConfirm({ kind: 'bulkApprove', targets: selected }),
        },
        {
          label: 'Deny',
          onClick: (selected: SerialRow[]) => setConfirm({ kind: 'deny', targets: selected }),
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
        countLabel={filtered.length === 1 ? 'transfer' : 'transfers'}
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
        getRowId={(p) => p.data.transfer_id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={onRowClicked}
        showColumnPicker={false}
        selectable
        massActions={massActions}
      />

      <ConfirmDialog
        open={confirm?.kind === 'deny'}
        title={
          confirm?.kind === 'deny'
            ? confirm.targets.length === 1
              ? `Deny transfer for ${confirm.targets[0]?.full_name}?`
              : `Deny ${confirm.targets.length} transfers?`
            : ''
        }
        description="The member keeps their existing membership at the source scope. (Note: denial flow is stubbed pending its Edge Function.)"
        confirmLabel="Deny"
        onConfirm={() => {
          setConfirm(null);
          runDeny();
        }}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm?.kind === 'bulkApprove'}
        title={
          confirm?.kind === 'bulkApprove' ? `Approve ${confirm.targets.length} transfers?` : ''
        }
        description="Each transfer closes the source membership and opens a fresh active one at this scope. The source-scope admin is notified."
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
