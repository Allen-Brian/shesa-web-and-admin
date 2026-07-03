'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';

import { Button, ConfirmDialog, toast } from '@shesa/ui';

import { approveJoinRequest, rejectJoinRequest } from '../../../actions';
import type { RequestRow } from './switcher';

interface RequestsPanelProps {
  readonly requests: readonly RequestRow[];
}

export function RequestsPanel({ requests }: RequestsPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmReject, setConfirmReject] = useState<RequestRow | null>(null);

  const runApprove = (row: RequestRow) => {
    startTransition(async () => {
      const result = await approveJoinRequest(row.membership_id);
      if (!result.ok) {
        toast.error(result.message ?? 'Could not approve.');
        return;
      }
      toast.success(`${row.full_name} joined.`);
      router.refresh();
    });
  };

  const runReject = (row: RequestRow) => {
    startTransition(async () => {
      const result = await rejectJoinRequest(row.membership_id);
      if (!result.ok) {
        toast.error(result.message ?? 'Could not reject.');
        return;
      }
      toast.success(`${row.full_name}'s request rejected.`);
      router.refresh();
    });
  };

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No pending join requests. New requests appear here for approval.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {requests.map((r) => (
        <div
          key={r.membership_id}
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-col gap-0.5">
            <div className="text-sm font-medium text-foreground">{r.full_name}</div>
            <div className="text-xs text-muted-foreground">
              {[r.batch_name, r.email, r.phone].filter(Boolean).join(' · ') || '—'}
            </div>
            <div className="text-xs text-muted-foreground">
              via <span className="font-mono">{r.join_method}</span> ·{' '}
              {new Date(r.requested_at).toLocaleDateString()}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button type="button" size="sm" disabled={pending} onClick={() => runApprove(r)}>
              <Check className="h-4 w-4" />
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setConfirmReject(r)}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={!!confirmReject}
        title={confirmReject ? `Reject ${confirmReject.full_name}?` : ''}
        description="The request is rejected and the pending membership row is closed. The member is notified and can re-request later."
        confirmLabel="Reject"
        onConfirm={() => {
          if (!confirmReject) return;
          const target = confirmReject;
          setConfirmReject(null);
          runReject(target);
        }}
        onCancel={() => setConfirmReject(null)}
      />
    </div>
  );
}
