'use client';

import { ConfirmDialog } from '@shesa/ui';

import type {
  CampaignRow,
  DonationRow,
  NewCampaignForm,
  ScopeOption,
  WalkInForm,
} from './donations-types';
import { ExtendCampaignDialog } from './extend-campaign-dialog';
import { NewCampaignDialog } from './new-campaign-dialog';
import { ReverseDonationDialog } from './reverse-donation-dialog';
import { WalkInDialog } from './walk-in-dialog';

interface DonationsDialogsProps {
  readonly pending: boolean;
  readonly scopeOptions: readonly ScopeOption[];
  readonly activeCampaigns: readonly CampaignRow[];

  readonly newCampaignOpen: boolean;
  readonly onNewCampaignOpenChange: (open: boolean) => void;
  readonly newCampaignForm: NewCampaignForm;
  readonly onNewCampaignFormChange: (patch: Partial<NewCampaignForm>) => void;
  readonly onNewCampaignSubmit: () => void;

  readonly extendTarget: CampaignRow | null;
  readonly onExtendClose: () => void;
  readonly extendDate: string;
  readonly onExtendDateChange: (v: string) => void;
  readonly extendReason: string;
  readonly onExtendReasonChange: (v: string) => void;
  readonly onExtendSubmit: () => void;

  readonly walkInOpen: boolean;
  readonly onWalkInOpenChange: (open: boolean) => void;
  readonly walkInForm: WalkInForm;
  readonly onWalkInFormChange: (patch: Partial<WalkInForm>) => void;
  readonly onWalkInSubmit: () => void;

  readonly reversing: DonationRow | null;
  readonly onReverseClose: () => void;
  readonly reverseReason: string;
  readonly onReverseReasonChange: (v: string) => void;
  readonly onReverseSubmit: () => void;

  readonly closingId: string | null;
  readonly onCloseCancelled: () => void;
  readonly onCloseConfirmed: () => void;

  readonly archivingId: string | null;
  readonly onArchiveCancelled: () => void;
  readonly onArchiveConfirmed: () => void;
}

/**
 * Bundles every dialog the donations view mounts — four form dialogs
 * (new campaign, extend, walk-in, reverse) plus two confirm dialogs
 * (close, archive). Extracted so the orchestrator stays under the
 * 200-line cap without half its body being dialog JSX.
 */
export function DonationsDialogs(props: DonationsDialogsProps) {
  return (
    <>
      <NewCampaignDialog
        open={props.newCampaignOpen}
        onOpenChange={props.onNewCampaignOpenChange}
        form={props.newCampaignForm}
        onFormChange={props.onNewCampaignFormChange}
        scopeOptions={props.scopeOptions}
        onSubmit={props.onNewCampaignSubmit}
        pending={props.pending}
      />
      <ExtendCampaignDialog
        target={props.extendTarget}
        onClose={props.onExtendClose}
        date={props.extendDate}
        onDateChange={props.onExtendDateChange}
        reason={props.extendReason}
        onReasonChange={props.onExtendReasonChange}
        onSubmit={props.onExtendSubmit}
        pending={props.pending}
      />
      <WalkInDialog
        open={props.walkInOpen}
        onOpenChange={props.onWalkInOpenChange}
        form={props.walkInForm}
        onFormChange={props.onWalkInFormChange}
        activeCampaigns={props.activeCampaigns}
        onSubmit={props.onWalkInSubmit}
        pending={props.pending}
      />
      <ReverseDonationDialog
        target={props.reversing}
        onClose={props.onReverseClose}
        reason={props.reverseReason}
        onReasonChange={props.onReverseReasonChange}
        onSubmit={props.onReverseSubmit}
        pending={props.pending}
      />

      <ConfirmDialog
        open={!!props.closingId}
        title="Close this campaign?"
        description="Stops accepting donations immediately."
        confirmLabel="Close"
        onConfirm={props.onCloseConfirmed}
        onCancel={props.onCloseCancelled}
      />
      <ConfirmDialog
        open={!!props.archivingId}
        title="Archive this campaign?"
        description="Existing donations stay in the ledger. Archive just hides the campaign from live lists."
        confirmLabel="Archive"
        onConfirm={props.onArchiveConfirmed}
        onCancel={props.onArchiveCancelled}
      />
    </>
  );
}
