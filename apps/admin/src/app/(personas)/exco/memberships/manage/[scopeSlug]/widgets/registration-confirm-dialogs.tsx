'use client';

import { ConfirmDialog } from '@shesa/ui';

import { ReasonDialog } from './reason-dialog';
import type { RegistrationConfirmState } from './registration-row-types';

interface RegistrationConfirmDialogsProps {
  readonly confirm: RegistrationConfirmState;
  readonly reason: string;
  readonly note: string;
  readonly pending: boolean;
  readonly onReasonChange: (v: string) => void;
  readonly onNoteChange: (v: string) => void;
  readonly onMarkPaid: (
    target: NonNullable<RegistrationConfirmState & { kind: 'markPaid' }>['target'],
  ) => void;
  readonly onWaive: (
    target: NonNullable<RegistrationConfirmState & { kind: 'waive' }>['target'],
  ) => void;
  readonly onPayOnBehalf: (
    target: NonNullable<RegistrationConfirmState & { kind: 'payOnBehalf' }>['target'],
  ) => void;
  readonly onEscalate: (
    target: NonNullable<RegistrationConfirmState & { kind: 'escalate' }>['target'],
  ) => void;
  readonly onBulkMarkPaid: (
    targets: NonNullable<RegistrationConfirmState & { kind: 'bulkMarkPaid' }>['targets'],
  ) => void;
  readonly onBulkEscalate: (
    targets: NonNullable<RegistrationConfirmState & { kind: 'bulkEscalate' }>['targets'],
  ) => void;
  readonly onDismiss: () => void;
}

/**
 * All six confirm variants for the registration table wrapped in one
 * component so the table's main render stays focused on the grid.
 * Each variant is either a ConfirmDialog or a ReasonDialog (custom
 * dialog with a textbox), keyed off `confirm.kind`.
 */
export function RegistrationConfirmDialogs({
  confirm,
  reason,
  note,
  pending,
  onReasonChange,
  onNoteChange,
  onMarkPaid,
  onWaive,
  onPayOnBehalf,
  onEscalate,
  onBulkMarkPaid,
  onBulkEscalate,
  onDismiss,
}: RegistrationConfirmDialogsProps) {
  return (
    <>
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
          onMarkPaid(confirm.target);
        }}
        onCancel={onDismiss}
      />

      <ReasonDialog
        open={confirm?.kind === 'waive'}
        title={confirm?.kind === 'waive' ? `Waive ${confirm.target.full_name}'s fee?` : ''}
        description="Records waived_at + waived_by + a reason. Audited."
        value={reason}
        onChange={onReasonChange}
        placeholder="Reason for waiver (visible to admins)"
        confirmLabel="Waive"
        pending={pending}
        onConfirm={() => {
          if (confirm?.kind !== 'waive') return;
          onWaive(confirm.target);
        }}
        onCancel={onDismiss}
      />

      <ReasonDialog
        open={confirm?.kind === 'payOnBehalf'}
        title={
          confirm?.kind === 'payOnBehalf' ? `Pay ${confirm.target.full_name}'s fee on behalf?` : ''
        }
        description="Records paid_on_behalf_at + paid_on_behalf_by + a note. The current user is recorded as the payer. Audited."
        value={note}
        onChange={onNoteChange}
        placeholder="Note (e.g. payer name, method)"
        confirmLabel="Pay on behalf"
        pending={pending}
        onConfirm={() => {
          if (confirm?.kind !== 'payOnBehalf') return;
          onPayOnBehalf(confirm.target);
        }}
        onCancel={onDismiss}
      />

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
          onEscalate(confirm.target);
        }}
        onCancel={onDismiss}
      />

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
          onBulkMarkPaid(confirm.targets);
        }}
        onCancel={onDismiss}
      />

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
          onBulkEscalate(confirm.targets);
        }}
        onCancel={onDismiss}
      />
    </>
  );
}
