'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from '@shesa/ui';

import { archiveCharge, createCharge, deleteCharge, updateCharge } from '../charge-actions';
import type { CreateForm, EditForm, ScopeOption } from './charges-types';

interface UseChargesActionsInput {
  readonly scopeOptions: readonly ScopeOption[];
}

/**
 * Consolidates every mutation for the charges view — create / edit /
 * archive / delete — behind one hook. Activation is a status flip on
 * the edit dialog (draft → active), and obligation generation now
 * happens automatically inside the update edge fn on that transition,
 * so neither shows up as a stand-alone row action.
 */
export function useChargesActions({ scopeOptions }: UseChargesActionsInput) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const runCreate = (form: CreateForm, onDone: () => void) => {
    if (!form.scopeId) return toast.error('Pick a scope.');
    if (!form.name.trim()) return toast.error('Name is required.');
    const amount = parseFloat(form.baseAmount);
    if (!Number.isFinite(amount) || amount <= 0)
      return toast.error('Enter a positive base amount.');
    const scope = scopeOptions.find((s) => s.id === form.scopeId);
    if (!scope) return toast.error('Invalid scope.');

    const isGroup = form.targetPartyType === 'branch';
    if (isGroup && form.chargeTargets.length === 0)
      return toast.error('Pick at least one target for a Group charge.');
    const chargeTargets = isGroup
      ? form.chargeTargets.map((t) => ({
          targetScopeId: t.targetScopeId,
          amount: parseFloat(t.amount),
        }))
      : [];
    if (isGroup && chargeTargets.some((t) => !Number.isFinite(t.amount) || t.amount <= 0))
      return toast.error('Every target needs a positive amount.');

    startTransition(async () => {
      const result = await createCharge({
        scopeId: form.scopeId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        baseAmount: amount,
        currency: scope.currency,
        recurrence: form.recurrence,
        recurrenceInterval: 1,
        activationDate: new Date(form.activationDate).toISOString(),
        targetPartyType: form.targetPartyType,
        chargeTargets: isGroup ? chargeTargets : undefined,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Charge created as draft.');
      onDone();
      router.refresh();
    });
  };

  const runEdit = (editing: EditForm, onDone: () => void) => {
    if (!editing.name.trim()) return toast.error('Name is required.');
    const isDraft = editing.status === 'draft';
    const isOneTime = editing.recurrence === 'one_time';
    const isGroup = editing.targetPartyType === 'branch';
    // Amount edits are allowed on a draft, or on a live recurring
    // charge (scheduled for next period). One-time live charges freeze.
    const amountEditable = isDraft || !isOneTime;
    const amount = editing.baseAmount ? parseFloat(editing.baseAmount) : NaN;
    const targets = editing.chargeTargets.map((t) => ({
      targetScopeId: t.targetScopeId,
      amount: parseFloat(t.amount),
    }));

    // Individual charges carry a base amount; group charges carry
    // per-target amounts. Send only what applies + is editable.
    const sendBaseAmount = !isGroup && amountEditable ? amount : undefined;
    const sendTargets = isGroup && amountEditable ? targets : undefined;

    if (sendBaseAmount !== undefined && (!Number.isFinite(sendBaseAmount) || sendBaseAmount <= 0))
      return toast.error('Enter a positive base amount.');
    if (isDraft && isGroup && targets.length === 0)
      return toast.error('Group charges need at least one target.');
    if (sendTargets && sendTargets.some((t) => !Number.isFinite(t.amount) || t.amount <= 0))
      return toast.error('Every target needs a positive amount.');

    startTransition(async () => {
      const result = await updateCharge({
        id: editing.id,
        name: editing.name.trim(),
        description: editing.description.trim() || null,
        activationDate: new Date(editing.activationDate).toISOString(),
        status: editing.status,
        baseAmount: sendBaseAmount,
        // Recurrence + the target SET are draft-only.
        recurrence: isDraft ? editing.recurrence : undefined,
        chargeTargets: sendTargets,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const effective = result.data?.scheduledEffective;
      toast.success(
        effective
          ? `Change scheduled — takes effect ${new Date(effective).toLocaleDateString()}.`
          : editing.status === 'active'
            ? 'Charge saved — obligations will populate shortly.'
            : 'Charge updated.',
      );
      onDone();
      router.refresh();
    });
  };

  const runPublish = (id: string) => {
    startTransition(async () => {
      const result = await updateCharge({ id, status: 'active' });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Charge published — obligations are populating.');
      router.refresh();
    });
  };

  const runArchive = (id: string) => {
    startTransition(async () => {
      const result = await archiveCharge(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Charge archived.');
      router.refresh();
    });
  };

  const runDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteCharge(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Charge deleted.');
      router.refresh();
    });
  };

  // Bulk helpers loop the single-id edge calls (there is no batch edge
  // fn). Failures are counted, not fatal — a mixed selection where some
  // rows can't take the transition still applies to the ones that can.
  const runBulk = (
    ids: readonly string[],
    apply: (id: string) => Promise<{ ok: boolean; message?: string }>,
    verb: string,
    onDone?: () => void,
  ) => {
    if (ids.length === 0) return;
    startTransition(async () => {
      const results = await Promise.all(ids.map(apply));
      const failed = results.filter((r) => !r.ok).length;
      const ok = results.length - failed;
      if (ok > 0) toast.success(`${ok} charge${ok === 1 ? '' : 's'} ${verb}.`);
      if (failed > 0)
        toast.error(`${failed} charge${failed === 1 ? '' : 's'} could not be ${verb}.`);
      onDone?.();
      router.refresh();
    });
  };

  const runBulkArchive = (ids: readonly string[], onDone?: () => void) =>
    runBulk(ids, (id) => archiveCharge(id), 'archived', onDone);

  const runBulkStatus = (
    ids: readonly string[],
    status: 'active' | 'paused',
    onDone?: () => void,
  ) =>
    runBulk(
      ids,
      (id) => updateCharge({ id, status }),
      status === 'active' ? 'activated' : 'paused',
      onDone,
    );

  return {
    pending,
    runCreate,
    runEdit,
    runPublish,
    runArchive,
    runDelete,
    runBulkArchive,
    runBulkStatus,
  };
}
