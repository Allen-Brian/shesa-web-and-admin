'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, MailOpen, RefreshCcw } from 'lucide-react';

import {
  Badge,
  Button,
  DataTable,
  EntityTablePanel,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
} from '@shesa/ui';

import { resendInvite } from '../actions';

export type ClaimStatus = 'not_invited' | 'invited' | 'claimed' | 'disabled';

export interface InviteRow {
  readonly accountId: string;
  readonly memberId: string;
  readonly memberCode: string | null;
  readonly fullName: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly batchName: string | null;
  readonly batchSlug: string | null;
  readonly claimStatus: ClaimStatus;
  readonly invitedAt: string | null;
  readonly claimedAt: string | null;
  readonly lastSentAt: string | null;
  readonly resentCount: number;
  readonly inviteError: string | null;
  readonly createdAt: string;
}

type SerialRow = InviteRow & { readonly serial: number };

interface InvitesViewProps {
  readonly rows: readonly InviteRow[];
  readonly limit: number;
}

/**
 * Invites view — filter by batch + claim status, resend from a row.
 * Failed invites (invite_error set) are surfaced with an amber badge so
 * operators can hunt them without scrolling.
 */
export function InvitesView({ rows, limit }: InvitesViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [batchSlug, setBatchSlug] = useState<string>('__all');
  const [status, setStatus] = useState<'__all' | ClaimStatus | 'failed'>('__all');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [pending, startTransition] = useTransition();

  const batchOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const r of rows) {
      if (r.batchSlug && r.batchName) set.set(r.batchSlug, r.batchName);
    }
    return Array.from(set.entries())
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (batchSlug !== '__all' && r.batchSlug !== batchSlug) return false;
        if (status === 'failed') {
          if (!r.inviteError) return false;
        } else if (status !== '__all') {
          if (r.claimStatus !== status) return false;
        }
        if (!q) return true;
        if (r.fullName.toLowerCase().includes(q)) return true;
        if (r.email?.toLowerCase().includes(q)) return true;
        if (r.memberCode?.toLowerCase().includes(q)) return true;
        if (r.batchName?.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((r, i) => ({ ...r, serial: i + 1 }));
  }, [rows, search, batchSlug, status]);

  const stats = useMemo(() => {
    let invited = 0;
    let claimed = 0;
    let failed = 0;
    let notInvited = 0;
    for (const r of rows) {
      if (r.inviteError) failed += 1;
      if (r.claimStatus === 'invited') invited += 1;
      else if (r.claimStatus === 'claimed') claimed += 1;
      else if (r.claimStatus === 'not_invited') notInvited += 1;
    }
    return { invited, claimed, failed, notInvited };
  }, [rows]);

  const runResend = (memberId: string, fullName: string) => {
    startTransition(async () => {
      const result = await resendInvite(memberId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message ?? `Invite resent to ${fullName}.`);
      router.refresh();
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
      {
        headerName: 'Code',
        field: 'memberCode',
        width: 150,
        cellClass: 'font-mono text-xs',
        valueFormatter: (p) => p.value ?? '—',
      },
      { headerName: 'Name', field: 'fullName', flex: 2, minWidth: 200 },
      {
        headerName: 'Batch',
        field: 'batchName',
        width: 140,
        valueFormatter: (p) => p.value ?? '—',
      },
      {
        headerName: 'Email',
        field: 'email',
        flex: 1.5,
        minWidth: 180,
        valueFormatter: (p) => p.value ?? '—',
      },
      {
        headerName: 'Status',
        field: 'claimStatus',
        width: 130,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
          <StatusBadge
            status={(p.value as ClaimStatus) ?? null}
            error={p.data?.inviteError ?? null}
          />
        ),
      },
      {
        headerName: 'Last sent',
        field: 'lastSentAt',
        width: 140,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
      },
      {
        headerName: 'Resent',
        field: 'resentCount',
        width: 90,
        valueFormatter: (p) => (p.value != null ? String(p.value) : '0'),
      },
      {
        headerName: 'Action',
        colId: 'row_actions',
        width: 130,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          const isClaimed = p.data.claimStatus === 'claimed';
          return (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending || isClaimed || !p.data.email}
              onClick={(e) => {
                e.stopPropagation();
                runResend(p.data!.memberId, p.data!.fullName);
              }}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              {isClaimed ? 'Claimed' : 'Resend'}
            </Button>
          );
        },
      },
    ],
    [pending],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <MailOpen className="h-6 w-6" />
          Invites
        </h1>
        <p className="text-sm text-muted-foreground">
          Last {limit} invite rows. Newest-sent first. Resend from any row; failed invites carry the
          Auth API error inline.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Awaiting claim" value={stats.invited} tone="sky" />
        <StatCard label="Claimed" value={stats.claimed} tone="emerald" />
        <StatCard label="Not invited" value={stats.notInvited} tone="muted" />
        <StatCard label="Failed" value={stats.failed} tone="amber" />
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'invite' : 'invites'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={false}
        hideCreate
        createLabel=""
        onCreate={() => undefined}
        filters={
          <div className="flex items-center gap-2">
            <select
              value={batchSlug}
              onChange={(e) => setBatchSlug(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="__all">All batches</option>
              {batchOptions.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="__all">All statuses</option>
              <option value="invited">Awaiting claim</option>
              <option value="claimed">Claimed</option>
              <option value="not_invited">Not invited</option>
              <option value="disabled">Disabled</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        }
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.accountId}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable={false}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: number;
  readonly tone: 'sky' | 'emerald' | 'amber' | 'muted';
}) {
  const toneCls: Record<string, string> = {
    sky: 'text-sky-700 dark:text-sky-300',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    amber: 'text-amber-700 dark:text-amber-400',
    muted: 'text-foreground',
  };
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`text-2xl font-semibold ${toneCls[tone]}`}>{value}</span>
    </div>
  );
}

function StatusBadge({
  status,
  error,
}: {
  readonly status: ClaimStatus | null;
  readonly error: string | null;
}) {
  if (error) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        title={error}
      >
        <AlertTriangle className="h-3 w-3" />
        Failed
      </Badge>
    );
  }
  if (!status) return <span className="text-muted-foreground">—</span>;
  const styles: Record<ClaimStatus, string> = {
    not_invited: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
    invited: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    claimed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    disabled: 'border-destructive/40 bg-destructive/10 text-destructive',
  };
  const labels: Record<ClaimStatus, string> = {
    not_invited: 'Not invited',
    invited: 'Awaiting claim',
    claimed: 'Claimed',
    disabled: 'Disabled',
  };
  return (
    <Badge variant="outline" className={styles[status]}>
      {labels[status]}
    </Badge>
  );
}
