'use client';

import { ConfirmDialog } from '@shesa/ui';

import { CreateContributionDialog } from './create-contribution-dialog';
import { ExtendContributionDialog } from './extend-contribution-dialog';
import type { ContributionRow, CreateForm, ScopeOption } from './contributions-types';

interface ContributionsDialogsProps {
  readonly pending: boolean;
  readonly scopeOptions: readonly ScopeOption[];

  readonly createOpen: boolean;
  readonly onCreateOpenChange: (open: boolean) => void;
  readonly createForm: CreateForm;
  readonly onCreateFormChange: (patch: Partial<CreateForm>) => void;
  readonly onCreateSubmit: () => void;

  readonly extendTarget: ContributionRow | null;
  readonly onExtendClose: () => void;
  readonly extendDate: string;
  readonly onExtendDateChange: (v: string) => void;
  readonly extendReason: string;
  readonly onExtendReasonChange: (v: string) => void;
  readonly onExtendSubmit: () => void;

  readonly closingId: string | null;
  readonly onCloseCancelled: () => void;
  readonly onCloseConfirmed: () => void;

  readonly archivingId: string | null;
  readonly onArchiveCancelled: () => void;
  readonly onArchiveConfirmed: () => void;
}

/**
 * Bundle the four dialogs (create, extend, close-confirm, archive-
 * confirm) so the orchestrator's JSX stays layout-focused instead of
 * being half dialog wiring.
 */
export function ContributionsDialogs(props: ContributionsDialogsProps) {
  return (
    <>
      <CreateContributionDialog
        open={props.createOpen}
        onOpenChange={props.onCreateOpenChange}
        form={props.createForm}
        onFormChange={props.onCreateFormChange}
        scopeOptions={props.scopeOptions}
        onSubmit={props.onCreateSubmit}
        pending={props.pending}
      />
      <ExtendContributionDialog
        target={props.extendTarget}
        onClose={props.onExtendClose}
        date={props.extendDate}
        onDateChange={props.onExtendDateChange}
        reason={props.extendReason}
        onReasonChange={props.onExtendReasonChange}
        onSubmit={props.onExtendSubmit}
        pending={props.pending}
      />

      <ConfirmDialog
        open={!!props.closingId}
        title="Close this contribution?"
        description="Stops accepting payments immediately. Reversible via Extend if you change your mind before archive."
        confirmLabel="Close"
        onConfirm={props.onCloseConfirmed}
        onCancel={props.onCloseCancelled}
      />
      <ConfirmDialog
        open={!!props.archivingId}
        title="Archive this contribution?"
        description="Recorded payments stay in the ledger. Archive just hides the campaign from live lists."
        confirmLabel="Archive"
        onConfirm={props.onArchiveConfirmed}
        onCancel={props.onArchiveCancelled}
      />
    </>
  );
}
