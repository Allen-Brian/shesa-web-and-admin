'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, Ban, Check, HandCoins, MoreHorizontal } from 'lucide-react';

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
  Label,
  Input,
  Textarea,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type MassActions,
} from '@shesa/ui';

import {
  escalateUnregistered,
  markRegistrationPaid,
  payRegistrationOnBehalf,
  waiveRegistration,
} from '../../../actions';

export interface RegistrationRow {
  readonly membership_id: string;
  readonly member_id: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly batch_year: number | null;
  readonly batch_name: string | null;
  readonly fee_required: boolean;
  readonly amount: number | null;
  readonly currency_code: string | null;
  readonly registration_state: 'not_required' | 'pending' | 'paid' | 'paid_on_behalf' | 'waived';
  readonly waived_reason: string | null;
  readonly paid_on_behalf_note: string | null;
  readonly joined_at: string | null;
  readonly membership_status: 'active' | 'passive';
}

type SerialRow = RegistrationRow & { readonly serial: number };

type ConfirmState =
  | null
  | { readonly kind: 'markPaid'; readonly target: RegistrationRow }
  | { readonly kind: 'waive'; readonly target: RegistrationRow }
  | { readonly kind: 'payOnBehalf'; readonly target: RegistrationRow }
  | { readonly kind: 'escalate'; readonly target: RegistrationRow }
  | { readonly kind: 'bulkMarkPaid'; readonly targets: readonly RegistrationRow[] }
  | { readonly kind: 'bulkEscalate'; readonly targets: readonly RegistrationRow[] };

interface RegistrationTableProps {
  readonly rows: readonly RegistrationRow[];
}

/**
 * Registration table — the operational surface for the reg-fee boolean.
 *
 * Default filter: exclude paid + waived + not_required (shows the
 * "action needed" set: pending + on-behalf-in-progress). The toggle
 * button flips to "show all."
 *
 * Row actions:
 *   - Mark paid
 *   - Waive (reason dialog)
 *   - Pay on behalf (note dialog)
 *   - Escalate unregistered (moves membership_status to passive; per
 *     the M1 lock this is a governance action on membership_status,
 *     NOT engagement)
 *
 * Mass actions:
 *   - Bulk mark paid
 *   - Bulk escalate
 */
export function RegistrationTable({ rows }: RegistrationTableProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  const numbered = useMemo<readonly SerialRow[]>(
    () => rows.map((r, i) => ({ ...r, serial: i + 1 })),
    [rows],
  );

  const visible = useMemo(() => {
    // Default view hides settled states (paid / on_behalf / waived /
    // not_required). Toggle shows everything.
    const q = search.trim().toLowerCase();
    return numbered.filter((r) => {
      if (!showAll) {
        if (
          r.registration_state === 'paid' ||
          r.registration_state === 'paid_on_behalf' ||
          r.registration_state === 'waived' ||
          r.registration_state === 'not_required'
        ) {
          return false;
        }
      }
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

  const columnDefs = useMemo<ColDef<SerialRow>[]>(
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
      { headerName: 'Name', field: 'full_name', flex: 2, minWidth: 200 },
      {
        headerName: 'Batch',
        field: 'batch_name',
        width: 120,
        valueFormatter: (p) => p.value ?? '—',
      },
      {
        headerName: 'Fee',
        field: 'amount',
        width: 130,
        valueFormatter: (p) => {
          const d = p.data;
          if (!d?.fee_required) return '—';
          if (d.amount == null) return d.currency_code ?? '—';
          return `${d.amount} ${d.currency_code ?? ''}`.trim();
        },
      },
      {
        headerName: 'State',
        field: 'registration_state',
        width: 150,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
          <StateBadge state={p.value ?? null} />
        ),
      },
      {
        headerName: 'Notes',
        colId: 'notes',
        flex: 1.5,
        minWidth: 200,
        valueGetter: (p) => p.data?.waived_reason ?? p.data?.paid_on_behalf_note ?? null,
        valueFormatter: (p) => p.value ?? '—',
      },
      {
        headerName: 'Membership',
        field: 'membership_status',
        width: 120,
        cellRenderer: (p: ICellRendererParams<SerialRow, string | null>) => (
          <MembershipBadge status={p.value ?? null} />
        ),
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        width: 96,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<SerialRow>) =>
          params.data ? <RowActions row={params.data} setConfirm={setConfirm} /> : null,
      },
    ],
    [],
  );

  const massActions = useMemo<MassActions<SerialRow>>(
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
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={showAll ? 'default' : 'outline'}
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? 'Showing all' : 'Showing action-needed only'}
        </Button>
      </div>

      <DataTable<SerialRow>
        rowData={visible as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.membership_id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        massActions={massActions}
      />

      {/* ─ Mark paid ─ */}
      <ConfirmDialog
        open={confirm?.kind === 'markPaid'}
        title={
          confirm?.kind === 'markPaid'
            ? `Mark ${confirm.target.full_name}'s registration paid?`
            : ''
        }
        description="Records marked_paid_at + marked_paid_by on the registration row. Audited."
        confirmLabel="Mark paid"
        onConfirm={() => {
          if (confirm?.kind !== 'markPaid') return;
          const target = confirm.target;
          setConfirm(null);
          doAction(
            () => markRegistrationPaid(target.membership_id),
            `${target.full_name}: marked paid.`,
          );
        }}
        onCancel={() => setConfirm(null)}
      />

      {/* ─ Waive ─ */}
      <ReasonDialog
        open={confirm?.kind === 'waive'}
        title={confirm?.kind === 'waive' ? `Waive ${confirm.target.full_name}'s fee?` : ''}
        description="Records waived_at + waived_by + a reason. Audited."
        value={reason}
        onChange={setReason}
        placeholder="Reason for waiver (visible to admins)"
        confirmLabel="Waive"
        pending={pending}
        onConfirm={() => {
          if (confirm?.kind !== 'waive') return;
          const target = confirm.target;
          setConfirm(null);
          doAction(
            () => waiveRegistration({ membershipId: target.membership_id, reason }),
            `${target.full_name}: waived.`,
          );
        }}
        onCancel={() => {
          setReason('');
          setConfirm(null);
        }}
      />

      {/* ─ Pay on behalf ─ */}
      <ReasonDialog
        open={confirm?.kind === 'payOnBehalf'}
        title={
          confirm?.kind === 'payOnBehalf' ? `Pay ${confirm.target.full_name}'s fee on behalf?` : ''
        }
        description="Records paid_on_behalf_at + paid_on_behalf_by + a note. The current user is recorded as the payer. Audited."
        value={note}
        onChange={setNote}
        placeholder="Note (e.g. payer name, method)"
        confirmLabel="Pay on behalf"
        pending={pending}
        onConfirm={() => {
          if (confirm?.kind !== 'payOnBehalf') return;
          const target = confirm.target;
          setConfirm(null);
          doAction(
            () => payRegistrationOnBehalf({ membershipId: target.membership_id, note }),
            `${target.full_name}: paid on behalf.`,
          );
        }}
        onCancel={() => {
          setNote('');
          setConfirm(null);
        }}
      />

      {/* ─ Escalate ─ */}
      <ConfirmDialog
        open={confirm?.kind === 'escalate'}
        title={
          confirm?.kind === 'escalate'
            ? `Move ${confirm.target.full_name} to passive standing?`
            : ''
        }
        description="Moves membership_status from active to passive. Their engagement column is untouched (per M1 lock — passive is standing, dormant is devotion; distinct)."
        confirmLabel="Move to passive"
        onConfirm={() => {
          if (confirm?.kind !== 'escalate') return;
          const target = confirm.target;
          setConfirm(null);
          doAction(
            () => escalateUnregistered(target.membership_id),
            `${target.full_name}: moved to passive standing.`,
          );
        }}
        onCancel={() => setConfirm(null)}
      />

      {/* ─ Bulk mark paid ─ */}
      <ConfirmDialog
        open={confirm?.kind === 'bulkMarkPaid'}
        title={
          confirm?.kind === 'bulkMarkPaid'
            ? `Mark ${confirm.targets.length} row${confirm.targets.length === 1 ? '' : 's'} paid?`
            : ''
        }
        description="Fires markRegistrationPaid for each selected row. Non-atomic; per-row failures are surfaced in the toast summary."
        confirmLabel="Mark paid"
        onConfirm={() => {
          if (confirm?.kind !== 'bulkMarkPaid') return;
          const targets = confirm.targets;
          setConfirm(null);
          startTransition(async () => {
            const results = await Promise.all(
              targets.map((t) => markRegistrationPaid(t.membership_id)),
            );
            const failed = results.filter((r) => !r.ok);
            if (failed.length === 0) {
              toast.success(`Marked ${targets.length} paid.`);
            } else if (failed.length === targets.length) {
              toast.error('Could not mark any paid.');
            } else {
              toast.error(`Marked ${targets.length - failed.length}; ${failed.length} failed.`);
            }
            router.refresh();
          });
        }}
        onCancel={() => setConfirm(null)}
      />

      {/* ─ Bulk escalate ─ */}
      <ConfirmDialog
        open={confirm?.kind === 'bulkEscalate'}
        title={
          confirm?.kind === 'bulkEscalate'
            ? `Move ${confirm.targets.length} row${confirm.targets.length === 1 ? '' : 's'} to passive?`
            : ''
        }
        description="Fires escalateUnregistered for each. Membership_status only; engagement untouched."
        confirmLabel="Move to passive"
        onConfirm={() => {
          if (confirm?.kind !== 'bulkEscalate') return;
          const targets = confirm.targets;
          setConfirm(null);
          startTransition(async () => {
            const results = await Promise.all(
              targets.map((t) => escalateUnregistered(t.membership_id)),
            );
            const failed = results.filter((r) => !r.ok);
            if (failed.length === 0) {
              toast.success(`Moved ${targets.length} to passive.`);
            } else if (failed.length === targets.length) {
              toast.error('Could not move any.');
            } else {
              toast.error(`Moved ${targets.length - failed.length}; ${failed.length} failed.`);
            }
            router.refresh();
          });
        }}
        onCancel={() => setConfirm(null)}
      />

      {pending && <span className="sr-only">Working…</span>}
    </div>
  );
}

function StateBadge({ state }: { readonly state: string | null }) {
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

function MembershipBadge({ status }: { readonly status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const styles: Record<string, string> = {
    active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    passive: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  };
  return (
    <Badge variant="outline" className={styles[status] ?? 'border-border text-foreground'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function RowActions({
  row,
  setConfirm,
}: {
  readonly row: SerialRow;
  readonly setConfirm: (c: ConfirmState) => void;
}) {
  const isSettled =
    row.registration_state === 'paid' ||
    row.registration_state === 'paid_on_behalf' ||
    row.registration_state === 'waived' ||
    row.registration_state === 'not_required';
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
        <DropdownMenuLabel>Registration</DropdownMenuLabel>
        <DropdownMenuItem
          disabled={isSettled}
          onClick={() => setConfirm({ kind: 'markPaid', target: row })}
        >
          <Check className="h-4 w-4" />
          Mark paid
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isSettled}
          onClick={() => setConfirm({ kind: 'payOnBehalf', target: row })}
        >
          <HandCoins className="h-4 w-4" />
          Pay on behalf
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isSettled}
          onClick={() => setConfirm({ kind: 'waive', target: row })}
        >
          <Ban className="h-4 w-4" />
          Waive
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Governance</DropdownMenuLabel>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          disabled={row.membership_status !== 'active'}
          onClick={() => setConfirm({ kind: 'escalate', target: row })}
        >
          <ArrowDown className="h-4 w-4" />
          Move to passive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Small custom Dialog that lets the user type a reason/note before
 * confirming. Reusing ConfirmDialog would drop the textarea.
 */
function ReasonDialog({
  open,
  title,
  description,
  value,
  onChange,
  placeholder,
  confirmLabel,
  pending,
  onConfirm,
  onCancel,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly description: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly placeholder: string;
  readonly confirmLabel: string;
  readonly pending: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor="reason">Details</Label>
          {value.length > 40 ? (
            <Textarea
              id="reason"
              rows={3}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              maxLength={500}
            />
          ) : (
            <Input
              id="reason"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              maxLength={500}
            />
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onConfirm} disabled={pending}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
