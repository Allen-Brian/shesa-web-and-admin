'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { DataTable, EntityTablePanel, toast, type GridApi, type MassActions } from '@shesa/ui';

import {
  escalateUnregistered,
  markRegistrationPaid,
  payRegistrationOnBehalf,
  waiveRegistration,
} from '../../../registration-actions';
import { buildRegistrationColumns } from './registration-columns';
import { RegistrationConfirmDialogs } from './registration-confirm-dialogs';
import {
  isSettledRegistration,
  type RegistrationConfirmState,
  type RegistrationRow,
  type SerialRegistrationRow,
} from './registration-row-types';

export type { RegistrationRow } from './registration-row-types';

interface RegistrationTableProps {
  readonly rows: readonly RegistrationRow[];
  readonly scopeSlug: string;
}

/**
 * Registration table — the operational surface for the reg-fee boolean.
 *
 * Default filter hides settled rows (paid + on-behalf + waived +
 * not_required), leaving the "action-needed" set. Toggle flips to show
 * everything. Row actions and mass actions dispatch via ConfirmDialog /
 * ReasonDialog before hitting the Server Actions.
 */
export function RegistrationTable({ rows, scopeSlug }: RegistrationTableProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<SerialRegistrationRow> | null>(null);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [confirm, setConfirm] = useState<RegistrationConfirmState>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  const numbered = useMemo<readonly SerialRegistrationRow[]>(
    () => rows.map((r, i) => ({ ...r, serial: i + 1 })),
    [rows],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return numbered.filter((r) => {
      if (!showAll && isSettledRegistration(r.registration_state)) return false;
      if (!q) return true;
      if (r.full_name.toLowerCase().includes(q)) return true;
      if (r.batch_name?.toLowerCase().includes(q)) return true;
      if (r.email?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [numbered, search, showAll]);

  const doAction = (fn: () => Promise<{ ok: boolean; message?: string }>, ok: string) => {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        toast.error(result.message ?? 'Action failed.');
        return;
      }
      toast.success(ok);
      router.refresh();
      setReason('');
      setNote('');
    });
  };

  const dismiss = () => {
    setConfirm(null);
    setReason('');
    setNote('');
  };

  const runBulk = (
    targets: readonly RegistrationRow[],
    action: (id: string) => Promise<{ ok: boolean; message?: string }>,
    successVerb: string,
    failVerb: string,
  ) => {
    startTransition(async () => {
      const results = await Promise.all(targets.map((t) => action(t.membership_id)));
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        toast.success(`${successVerb} ${targets.length}.`);
      } else if (failed.length === targets.length) {
        toast.error(`Could not ${failVerb} any.`);
      } else {
        toast.error(`${successVerb} ${targets.length - failed.length}; ${failed.length} failed.`);
      }
      router.refresh();
    });
  };

  const columnDefs = useMemo(() => buildRegistrationColumns({ setConfirm }), []);

  const massActions = useMemo<MassActions<SerialRegistrationRow>>(
    () => ({
      itemName: 'row',
      pluralItemName: 'rows',
      custom: [
        {
          label: 'Mark paid',
          onClick: (selected) => setConfirm({ kind: 'bulkMarkPaid', targets: selected }),
        },
        {
          label: 'Escalate to passive',
          onClick: (selected) => setConfirm({ kind: 'bulkEscalate', targets: selected }),
          destructive: true,
        },
      ],
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={visible.length}
        countLabel={visible.length === 1 ? 'row' : 'rows'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={false}
        hideCreate
        createLabel=""
        onCreate={() => undefined}
        showActiveOnly={!showAll}
        onShowActiveOnlyChange={(next) => setShowAll(!next)}
        showActiveLabel="Show action-needed only"
      />

      <DataTable<SerialRegistrationRow>
        rowData={visible as SerialRegistrationRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.membership_id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={(e) => {
          if (!e.data) return;
          router.push(`/exco/memberships/members/${scopeSlug}/${e.data.member_id}`);
        }}
        showColumnPicker={false}
        massActions={massActions}
      />

      <RegistrationConfirmDialogs
        confirm={confirm}
        reason={reason}
        note={note}
        pending={pending}
        onReasonChange={setReason}
        onNoteChange={setNote}
        onMarkPaid={(target) => {
          setConfirm(null);
          doAction(
            () => markRegistrationPaid(target.membership_id),
            `${target.full_name}: marked paid.`,
          );
        }}
        onWaive={(target) => {
          setConfirm(null);
          doAction(
            () => waiveRegistration({ membershipId: target.membership_id, reason }),
            `${target.full_name}: waived.`,
          );
        }}
        onPayOnBehalf={(target) => {
          setConfirm(null);
          doAction(
            () => payRegistrationOnBehalf({ membershipId: target.membership_id, note }),
            `${target.full_name}: paid on behalf.`,
          );
        }}
        onEscalate={(target) => {
          setConfirm(null);
          doAction(
            () => escalateUnregistered(target.membership_id),
            `${target.full_name}: moved to passive standing.`,
          );
        }}
        onBulkMarkPaid={(targets) => {
          setConfirm(null);
          runBulk(targets, markRegistrationPaid, 'Marked', 'mark');
        }}
        onBulkEscalate={(targets) => {
          setConfirm(null);
          runBulk(targets, escalateUnregistered, 'Moved to passive', 'move');
        }}
        onDismiss={dismiss}
      />

      {pending && <span className="sr-only">Working…</span>}
    </div>
  );
}
