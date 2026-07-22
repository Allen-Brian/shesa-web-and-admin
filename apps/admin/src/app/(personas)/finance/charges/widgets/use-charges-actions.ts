'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from '@shesa/ui';

import { archiveCharge, createCharge, generateObligations, updateCharge } from '../actions';
import type { CreateForm, EditForm, ScopeOption } from './charges-types';

interface UseChargesActionsInput {
  readonly scopeOptions: readonly ScopeOption[];
}

/**
 * Consolidates every mutation for the charges view — create / edit /
 * archive / activate a draft / regenerate obligations — behind one
 * hook. Each action validates client-side, awaits its server action,
 * toasts, and refreshes on success.
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
    startTransition(async () => {
      const result = await updateCharge({
        id: editing.id,
        name: editing.name.trim(),
        description: editing.description.trim() || null,
        activationDate: new Date(editing.activationDate).toISOString(),
        status: editing.status,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Charge updated.');
      onDone();
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

  const runActivate = (chargeId: string) => {
    startTransition(async () => {
      const result = await updateCharge({ id: chargeId, status: 'active' });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Charge activated.');
      router.refresh();
    });
  };

  const runGenerate = (chargeId: string) => {
    startTransition(async () => {
      const result = await generateObligations(chargeId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const inserted = result.data?.inserted ?? 0;
      toast.success(
        inserted > 0
          ? `Generated ${inserted} obligation${inserted === 1 ? '' : 's'}.`
          : 'No new obligations — the current period is already covered.',
      );
      router.refresh();
    });
  };

  return { pending, runCreate, runEdit, runArchive, runActivate, runGenerate };
}
