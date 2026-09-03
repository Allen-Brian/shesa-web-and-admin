'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from '@shesa/ui';

import {
  approveCampaign,
  archiveCampaign,
  closeCampaign,
  createCampaign,
  extendCampaign,
  recordWalkInDonation,
  reverseDonation,
} from '../donation-actions';
import type { CampaignRow, NewCampaignForm, ScopeOption, WalkInForm } from './donations-types';

interface UseDonationsActionsInput {
  readonly scopeOptions: readonly ScopeOption[];
  readonly activeCampaigns: readonly CampaignRow[];
}

/**
 * Consolidates every mutation for the donations view — create /
 * approve / close / extend / archive campaign, walk-in donation, and
 * donation reversal — behind one hook so the orchestrator stays
 * layout-focused.
 *
 * Each action does its own toast + router.refresh, validates its
 * inputs client-side, and delegates to the sibling server-action file.
 * Returns a `pending` flag mirroring `useTransition` so buttons can
 * disable during in-flight requests.
 */
export function useDonationsActions({ scopeOptions, activeCampaigns }: UseDonationsActionsInput) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const runCreateCampaign = (form: NewCampaignForm, onDone: () => void) => {
    if (!form.scopeId) return toast.error('Pick a scope.');
    if (!form.name.trim()) return toast.error('Name is required.');
    const scope = scopeOptions.find((s) => s.id === form.scopeId);
    if (!scope) return toast.error('Invalid scope.');
    const openDate = new Date(form.openDate);
    const closeDate = new Date(form.closeDate);
    if (closeDate.getTime() <= openDate.getTime())
      return toast.error('Close date must be after open date.');

    startTransition(async () => {
      const result = await createCampaign({
        scopeId: scope.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        currency: scope.currency,
        openDate: openDate.toISOString(),
        closeDate: closeDate.toISOString(),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Campaign created as draft. Approve to open donations.');
      onDone();
      router.refresh();
    });
  };

  const runApproveCampaign = (id: string) => {
    startTransition(async () => {
      const result = await approveCampaign(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Campaign is open — accepting donations.');
      router.refresh();
    });
  };

  const runCloseCampaign = (id: string) => {
    startTransition(async () => {
      const result = await closeCampaign(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Campaign closed.');
      router.refresh();
    });
  };

  const runExtendCampaign = (
    target: CampaignRow,
    dateIso: string,
    reason: string | undefined,
    onDone: () => void,
  ) => {
    if (!dateIso) return toast.error('Pick a new close date.');
    const newClose = new Date(dateIso);
    if (target.closeDate && newClose.getTime() <= new Date(target.closeDate).getTime())
      return toast.error('New close date must be after the current one.');
    startTransition(async () => {
      const result = await extendCampaign(target.id, newClose.toISOString(), reason);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Campaign extended.');
      onDone();
      router.refresh();
    });
  };

  const runArchiveCampaign = (id: string) => {
    startTransition(async () => {
      const result = await archiveCampaign(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Campaign archived.');
      router.refresh();
    });
  };

  const runWalkIn = (form: WalkInForm, onDone: () => void) => {
    if (!form.campaignId) return toast.error('Pick a campaign.');
    const campaign = activeCampaigns.find((c) => c.id === form.campaignId);
    if (!campaign) return toast.error('Campaign not open for donations.');
    const amount = parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a positive amount.');
    startTransition(async () => {
      const result = await recordWalkInDonation({
        chargeId: campaign.id,
        amount,
        currency: campaign.currency,
        method: form.method,
        donorName: form.donorName.trim() || undefined,
        donorEmail: form.donorEmail.trim() || undefined,
        memo: form.memo.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Donation recorded.');
      onDone();
      router.refresh();
    });
  };

  const runReverse = (donationId: string, reason: string, onDone: () => void) => {
    if (!reason.trim()) return toast.error('Reason is required.');
    startTransition(async () => {
      const result = await reverseDonation(donationId, reason.trim());
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Donation reversed.');
      onDone();
      router.refresh();
    });
  };

  return {
    pending,
    runCreateCampaign,
    runApproveCampaign,
    runCloseCampaign,
    runExtendCampaign,
    runArchiveCampaign,
    runWalkIn,
    runReverse,
  };
}
