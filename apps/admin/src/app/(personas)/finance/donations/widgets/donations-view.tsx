'use client';

import { useMemo, useState } from 'react';
import { HandCoins } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shesa/ui';

import { buildCampaignColumns } from './campaign-columns';
import { CampaignsTab } from './campaigns-tab';
import { buildDonationColumns } from './donation-columns';
import { DonationsDialogs } from './donations-dialogs';
import { DonationsTab } from './donations-tab';
import { initialNewCampaign, initialWalkIn, suggestExtendedCloseDate } from './donations-helpers';
import type {
  CampaignRow,
  DonationRow,
  NewCampaignForm,
  ScopeOption,
  WalkInForm,
} from './donations-types';
import { useDonationsActions } from './use-donations-actions';

interface DonationsViewProps {
  readonly campaigns: readonly CampaignRow[];
  readonly donations: readonly DonationRow[];
  readonly scopeOptions: readonly ScopeOption[];
}

/**
 * Two-tab shell (donations + campaigns) with six dialogs behind it.
 * Data flow: form values live here; mutation logic lives in
 * `useDonationsActions`; per-tab filter state lives in each tab.
 * Dialog wiring is delegated to `DonationsDialogs` so this file stays
 * under the 200-line cap.
 */
export function DonationsView({ campaigns, donations, scopeOptions }: DonationsViewProps) {
  const activeCampaigns = useMemo(
    () => campaigns.filter((c) => c.lifecycle === 'open'),
    [campaigns],
  );
  const actions = useDonationsActions({ scopeOptions, activeCampaigns });
  const { pending } = actions;

  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [newCampaignForm, setNewCampaignForm] = useState<NewCampaignForm>(() =>
    initialNewCampaign(scopeOptions),
  );
  const [extendTarget, setExtendTarget] = useState<CampaignRow | null>(null);
  const [extendDate, setExtendDate] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [closingId, setClosingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInForm, setWalkInForm] = useState<WalkInForm>(() => initialWalkIn(activeCampaigns));
  const [reversing, setReversing] = useState<DonationRow | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  const openNewCampaign = () => {
    setNewCampaignForm(initialNewCampaign(scopeOptions));
    setNewCampaignOpen(true);
  };
  const openWalkIn = () => {
    setWalkInForm(initialWalkIn(activeCampaigns));
    setWalkInOpen(true);
  };
  const openExtend = (row: CampaignRow) => {
    setExtendTarget(row);
    setExtendDate(suggestExtendedCloseDate(row.closeDate));
    setExtendReason('');
  };
  const closeExtend = () => {
    setExtendTarget(null);
    setExtendDate('');
    setExtendReason('');
  };
  const closeReverse = () => {
    setReversing(null);
    setReverseReason('');
  };

  const campaignColumns = useMemo(
    () =>
      buildCampaignColumns({
        onApprove: actions.runApproveCampaign,
        onClose: setClosingId,
        onExtend: openExtend,
        onArchive: setArchivingId,
        pending,
      }),
    [pending],
  );

  const donationColumns = useMemo(
    () => buildDonationColumns({ onReverse: setReversing, pending }),
    [pending],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <HandCoins className="h-6 w-6" />
          Donations
        </h1>
        <p className="text-sm text-muted-foreground">
          Freewill gifts. Public entries come from the website; walk-ins are recorded here by
          Finance. Each donation gets an auto-generated receipt token.
        </p>
      </div>

      <Tabs defaultValue="donations" className="flex min-h-0 flex-1 flex-col gap-4">
        <TabsList className="w-fit">
          <TabsTrigger value="donations">
            Donations
            <span className="ml-1.5 text-xs text-muted-foreground">({donations.length})</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            Campaigns
            <span className="ml-1.5 text-xs text-muted-foreground">({campaigns.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="donations" className="flex min-h-0 flex-1 flex-col gap-3">
          <DonationsTab
            donations={donations}
            columnDefs={donationColumns}
            canWalkIn={activeCampaigns.length > 0}
            onOpenWalkIn={openWalkIn}
          />
        </TabsContent>

        <TabsContent value="campaigns" className="flex min-h-0 flex-1 flex-col gap-3">
          <CampaignsTab
            campaigns={campaigns}
            columnDefs={campaignColumns}
            canCreate={scopeOptions.length > 0}
            onOpenNewCampaign={openNewCampaign}
          />
        </TabsContent>
      </Tabs>

      <DonationsDialogs
        pending={pending}
        scopeOptions={scopeOptions}
        activeCampaigns={activeCampaigns}
        newCampaignOpen={newCampaignOpen}
        onNewCampaignOpenChange={setNewCampaignOpen}
        newCampaignForm={newCampaignForm}
        onNewCampaignFormChange={(patch) => setNewCampaignForm((f) => ({ ...f, ...patch }))}
        onNewCampaignSubmit={() =>
          actions.runCreateCampaign(newCampaignForm, () => setNewCampaignOpen(false))
        }
        extendTarget={extendTarget}
        onExtendClose={closeExtend}
        extendDate={extendDate}
        onExtendDateChange={setExtendDate}
        extendReason={extendReason}
        onExtendReasonChange={setExtendReason}
        onExtendSubmit={() => {
          if (!extendTarget) return;
          actions.runExtendCampaign(
            extendTarget,
            extendDate,
            extendReason.trim() || undefined,
            closeExtend,
          );
        }}
        walkInOpen={walkInOpen}
        onWalkInOpenChange={setWalkInOpen}
        walkInForm={walkInForm}
        onWalkInFormChange={(patch) => setWalkInForm((f) => ({ ...f, ...patch }))}
        onWalkInSubmit={() => actions.runWalkIn(walkInForm, () => setWalkInOpen(false))}
        reversing={reversing}
        onReverseClose={closeReverse}
        reverseReason={reverseReason}
        onReverseReasonChange={setReverseReason}
        onReverseSubmit={() => {
          if (!reversing) return;
          actions.runReverse(reversing.id, reverseReason, closeReverse);
        }}
        closingId={closingId}
        onCloseCancelled={() => setClosingId(null)}
        onCloseConfirmed={() => {
          if (closingId) actions.runCloseCampaign(closingId);
          setClosingId(null);
        }}
        archivingId={archivingId}
        onArchiveCancelled={() => setArchivingId(null)}
        onArchiveConfirmed={() => {
          if (archivingId) actions.runArchiveCampaign(archivingId);
          setArchivingId(null);
        }}
      />
    </div>
  );
}
