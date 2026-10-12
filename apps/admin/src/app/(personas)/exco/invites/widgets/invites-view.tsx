'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MailOpen } from 'lucide-react';

import { DataTable, EntityTablePanel, toast, type GridApi } from '@shesa/ui';

import { resendInvite } from '../invite-actions';
import { InvitesFilters, type StatusFilter } from './invites-filters';
import { InvitesStats } from './invites-stats';
import type { BatchOption, InviteRow, SerialRow } from './invite-widget-types';
import { useInviteColumns } from './use-invite-columns';

export type { InviteRow } from './invite-widget-types';

interface InvitesViewProps {
  readonly rows: readonly InviteRow[];
  readonly limit: number;
}

/**
 * Invites view — Mainstream-admin surface listing every account row
 * created by member imports. Composes the split widgets: stats,
 * filters, table.
 */
export function InvitesView({ rows, limit }: InvitesViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [batchSlug, setBatchSlug] = useState<string>('__all');
  const [status, setStatus] = useState<StatusFilter>('__all');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [pending, startTransition] = useTransition();

  const batchOptions: BatchOption[] = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) {
      if (r.batchSlug && r.batchName) seen.set(r.batchSlug, r.batchName);
    }
    return Array.from(seen.entries())
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo<SerialRow[]>(() => {
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
        return (
          r.fullName.toLowerCase().includes(q) ||
          !!r.email?.toLowerCase().includes(q) ||
          !!r.memberCode?.toLowerCase().includes(q) ||
          !!r.batchName?.toLowerCase().includes(q)
        );
      })
      .map((r, i) => ({ ...r, serial: i + 1 }));
  }, [rows, search, batchSlug, status]);

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

  const columnDefs = useInviteColumns({ pending, onResend: runResend });

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

      <InvitesStats rows={rows} />

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
          <InvitesFilters
            batchSlug={batchSlug}
            status={status}
            batchOptions={batchOptions}
            onBatchChange={setBatchSlug}
            onStatusChange={setStatus}
          />
        }
      />

      <DataTable<SerialRow>
        rowData={filtered}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.accountId}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable={false}
      />
    </div>
  );
}
