'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { ConfirmDialog, toast } from '@shesa/ui';

import { MemberName } from '@/components/governance/member-name';
import type { EngagementTier } from '@shesa/domain/memberships';

import { setEngagement } from '../../../../engagement-actions';
import { requestTransfer } from '../../../../join-transfer-actions';
import { removeMembership } from '../../../../membership-lifecycle-actions';
import {
  markRegistrationPaid,
  payRegistrationOnBehalf,
  waiveRegistration,
} from '../../../../registration-actions';
import { MemberProfileLeftRail } from './member-profile-left-rail';
import { MemberProfileRightRail } from './member-profile-right-rail';
import { MemberProfileTabs } from './member-profile-tabs';
import type {
  MemberProfile,
  MembershipHistoryRow,
  ProfileDialogState,
  ProfilePermissions,
  TransferDestination,
} from './member-profile-types';
import { ProfileReasonDialog } from './profile-reason-dialog';
import { ProfileTransferDialog } from './profile-transfer-dialog';

export type {
  MemberProfile,
  MembershipHistoryRow,
  ProfilePermissions,
  TransferDestination,
} from './member-profile-types';

interface Props {
  readonly viewerScopeSlug: string;
  readonly viewerScopeName: string;
  readonly viewerScopeId: string;
  readonly viewerMembershipId: string | null;
  readonly profile: MemberProfile;
  readonly history: readonly MembershipHistoryRow[];
  readonly transferDestinations: readonly TransferDestination[];
  readonly permissions: ProfilePermissions;
}

/**
 * Member profile — three-column layout per the M6 spec:
 *   left rail   → sectioned personal info (Contact / Personal / Membership)
 *   center      → tabs (Overview / Admin Activities)
 *   right rail  → Admin Options + Engagement + Household
 *
 * Owns the state that spans columns (active tab, dialog state, dialog
 * form values, transition pending). Every column, primitive, badge,
 * card, and dialog lives in its own file per the one-per-file rule.
 * Admin actions are permission-gated at render, re-checked server-side.
 */
export function MemberProfileView({
  viewerScopeSlug,
  viewerScopeName,
  viewerScopeId,
  viewerMembershipId,
  profile,
  history,
  transferDestinations,
  permissions,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'overview' | 'admin'>('overview');
  const [dialog, setDialog] = useState<ProfileDialogState>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [onBehalfNote, setOnBehalfNote] = useState('');
  const [transferDestId, setTransferDestId] = useState<string>('');
  const [transferReason, setTransferReason] = useState('');
  const [pending, startTransition] = useTransition();

  const currentAffiliation = history.find((h) => h.is_active) ?? null;
  const viewerMembership = history.find((h) => h.scope_id === viewerScopeId) ?? null;
  const hasActiveHere =
    !!viewerMembership &&
    (viewerMembership.status === 'active' || viewerMembership.status === 'passive');

  const closeDialog = () => {
    setDialog(null);
    setWaiveReason('');
    setOnBehalfNote('');
    setTransferDestId('');
    setTransferReason('');
  };

  // ── Action runners ──────────────────────────────────────────────────
  const runSetEngagement = (tier: EngagementTier) => {
    if (!viewerMembershipId) return;
    startTransition(async () => {
      const result = await setEngagement({ membershipIds: [viewerMembershipId], tier });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Engagement set to ${tier}.`);
      router.refresh();
    });
  };

  const runMarkPaid = () => {
    if (!viewerMembershipId) return;
    closeDialog();
    startTransition(async () => {
      const result = await markRegistrationPaid(viewerMembershipId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Registration marked paid.');
      router.refresh();
    });
  };

  const runWaive = () => {
    if (!viewerMembershipId) return;
    const reason = waiveReason;
    closeDialog();
    startTransition(async () => {
      const result = await waiveRegistration({ membershipId: viewerMembershipId, reason });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Registration waived.');
      router.refresh();
    });
  };

  const runPayOnBehalf = () => {
    if (!viewerMembershipId) return;
    const note = onBehalfNote;
    closeDialog();
    startTransition(async () => {
      const result = await payRegistrationOnBehalf({ membershipId: viewerMembershipId, note });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Registration recorded as paid on behalf.');
      router.refresh();
    });
  };

  const runTransfer = () => {
    if (!transferDestId) {
      toast.error('Pick a destination scope.');
      return;
    }
    const dest = transferDestId;
    const reason = transferReason.trim() || undefined;
    closeDialog();
    startTransition(async () => {
      const result = await requestTransfer({
        memberId: profile.id,
        sourceScopeId: viewerScopeId,
        destinationScopeId: dest,
        reason,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Transfer request created. Destination admin must approve.');
      router.refresh();
    });
  };

  const runRemove = () => {
    if (!viewerMembershipId) return;
    closeDialog();
    startTransition(async () => {
      const result = await removeMembership(viewerMembershipId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${profile.full_name} removed from ${viewerScopeName}.`);
      router.push(`/exco/memberships/members/${viewerScopeSlug}`);
    });
  };

  const needsMembershipDisabled = !viewerMembershipId;
  const transferDisabled = !hasActiveHere || transferDestinations.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <Link
        href={`/exco/memberships/members/${viewerScopeSlug}`}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {viewerScopeName} members
      </Link>

      <div className="flex flex-col gap-1">
        <MemberName name={profile.full_name} badge={profile.badge} />
        <div className="text-xs text-muted-foreground">
          {[profile.batch_name, profile.house_name, profile.network_name]
            .filter(Boolean)
            .join(' · ') || '—'}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
        <MemberProfileLeftRail profile={profile} currentAffiliation={currentAffiliation} />

        <MemberProfileTabs
          tab={tab}
          onTabChange={setTab}
          currentAffiliation={currentAffiliation}
          history={history}
        />

        <MemberProfileRightRail
          permissions={permissions}
          viewerScopeName={viewerScopeName}
          viewerMembership={viewerMembership}
          currentAffiliation={currentAffiliation}
          needsMembershipDisabled={needsMembershipDisabled}
          transferDisabled={transferDisabled}
          pending={pending}
          onSetEngagement={runSetEngagement}
          onOpenDialog={setDialog}
        />
      </div>

      {/* ─── Dialogs ─── */}
      <ConfirmDialog
        open={dialog?.kind === 'markPaid'}
        title={`Mark ${profile.full_name}'s registration paid?`}
        description="Records marked_paid_at + marked_paid_by on the registration row. Audited."
        confirmLabel="Mark paid"
        onConfirm={runMarkPaid}
        onCancel={closeDialog}
      />

      <ProfileReasonDialog
        open={dialog?.kind === 'waive'}
        title={`Waive ${profile.full_name}'s registration?`}
        description="Records waived_at + waived_by + a reason. Audited."
        value={waiveReason}
        onChange={setWaiveReason}
        placeholder="Reason for waiver (visible to admins)"
        confirmLabel="Waive"
        pending={pending}
        onConfirm={runWaive}
        onCancel={closeDialog}
      />

      <ProfileReasonDialog
        open={dialog?.kind === 'payOnBehalf'}
        title={`Pay ${profile.full_name}'s registration on behalf?`}
        description="Records paid_on_behalf_at + paid_on_behalf_by + a note. The current user is recorded as the payer. Audited."
        value={onBehalfNote}
        onChange={setOnBehalfNote}
        placeholder="Note (e.g. payer name, method)"
        confirmLabel="Pay on behalf"
        pending={pending}
        onConfirm={runPayOnBehalf}
        onCancel={closeDialog}
      />

      <ProfileTransferDialog
        open={dialog?.kind === 'transfer'}
        memberName={profile.full_name}
        sourceName={viewerScopeName}
        destinations={transferDestinations}
        destinationId={transferDestId}
        onDestinationChange={setTransferDestId}
        reason={transferReason}
        onReasonChange={setTransferReason}
        pending={pending}
        onConfirm={runTransfer}
        onCancel={closeDialog}
      />

      <ConfirmDialog
        open={dialog?.kind === 'remove'}
        title={`Remove ${profile.full_name} from ${viewerScopeName}?`}
        description="Sets the membership_status to 'left' with left_at = now. Arrears (if any) stay with this body — the destination starts fresh if they rejoin later."
        confirmLabel="Remove"
        onConfirm={runRemove}
        onCancel={closeDialog}
      />
    </div>
  );
}
