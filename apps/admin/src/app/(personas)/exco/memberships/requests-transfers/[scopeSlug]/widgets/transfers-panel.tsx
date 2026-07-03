'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Check, X } from 'lucide-react';

import { Badge, Button, ConfirmDialog, toast } from '@shesa/ui';

import { approveTransfer } from '../../../actions';
import type { TransferRow } from './switcher';

interface TransfersPanelProps {
  readonly transfers: readonly TransferRow[];
}

/**
 * Incoming transfers panel (destination view). Per the M1 flip:
 *   - This scope is the DESTINATION of every row here.
 *   - Approving fires `memberships/approve-transfer` which is
 *     destination-scoped — the current admin's grant here is what
 *     authorizes the approval. The M1 pgTAP case G asserts a
 *     source-only admin cannot approve.
 *   - The source scope's admin gets a notification event after
 *     approval; they don't appear here.
 *
 * Deny action is stubbed for now — the `memberships/reject-transfer`
 * Edge Function isn't shipped yet (deferred). The button is present so
 * the shape matches the Requests panel, but it toasts a "coming soon"
 * message and doesn't hit the server.
 */
export function TransfersPanel({ transfers }: TransfersPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDeny, setConfirmDeny] = useState<TransferRow | null>(null);

  const runApprove = (row: TransferRow) => {
    startTransition(async () => {
      const result = await approveTransfer(row.transfer_id);
      if (!result.ok) {
        toast.error(result.message ?? 'Could not approve transfer.');
        return;
      }
      toast.success(`${row.full_name} transferred from ${row.source_scope_name}.`);
      router.refresh();
    });
  };

  const runDeny = () => {
    // Placeholder — the deny path lands with a future Edge Function.
    toast.warning('Transfer denial is not implemented yet.');
  };

  if (transfers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No pending incoming transfers. When a member requests to move here from another scope, the
          request appears here for your approval.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {transfers.map((t) => (
        <div
          key={t.transfer_id}
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
              <span>{t.full_name}</span>
              <Badge variant="outline" className="gap-1 text-xs">
                <ArrowLeftRight className="h-3 w-3" />
                {t.source_scope_name}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {[t.batch_name, t.email, t.phone].filter(Boolean).join(' · ') || '—'}
            </div>
            <div className="text-xs text-muted-foreground">
              Requested {new Date(t.requested_at).toLocaleDateString()}
              {t.reason && <span className="italic"> · &ldquo;{t.reason}&rdquo;</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button type="button" size="sm" disabled={pending} onClick={() => runApprove(t)}>
              <Check className="h-4 w-4" />
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setConfirmDeny(t)}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
              Deny
            </Button>
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={!!confirmDeny}
        title={confirmDeny ? `Deny transfer for ${confirmDeny.full_name}?` : ''}
        description="The member keeps their existing membership at their source scope. The requester is notified. (Note: denial flow is stubbed pending its Edge Function.)"
        confirmLabel="Deny"
        onConfirm={() => {
          if (!confirmDeny) return;
          setConfirmDeny(null);
          runDeny();
        }}
        onCancel={() => setConfirmDeny(null)}
      />
    </div>
  );
}
