'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from '@shesa/ui';

import {
  approveContribution,
  archiveContribution,
  closeContribution,
  createContribution,
  extendContribution,
} from '../contribution-actions';
import type { ContributionRow, CreateForm, ScopeOption } from './contributions-types';

interface UseContributionsActionsInput {
  readonly scopeOptions: readonly ScopeOption[];
  /** When set, every runCreate call passes groupId through so the new contribution binds to a group. */
  readonly groupId?: string | null;
}

/**
 * Consolidates every mutation for the contributions view: create /
 * approve / close / extend / archive. Each action validates client-
 * side, awaits its server action, toasts, and refreshes on success.
 * Shape-specific amount validation lives inside `runCreate` so the
 * "goal requires a goal amount" / "ticketed requires a unit price"
 * rules stay in one place.
 */
export function useContributionsActions({ scopeOptions, groupId }: UseContributionsActionsInput) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const runCreate = (form: CreateForm, onDone: () => void) => {
    if (!form.scopeId) return toast.error('Pick a scope.');
    if (!form.name.trim()) return toast.error('Name is required.');
    const scope = scopeOptions.find((s) => s.id === form.scopeId);
    if (!scope) return toast.error('Invalid scope.');
    const openDate = new Date(form.openDate);
    const closeDate = new Date(form.closeDate);
    if (closeDate.getTime() <= openDate.getTime())
      return toast.error('Close date must be after open date.');

    const amount = form.amount ? parseFloat(form.amount) : undefined;
    const capacity = form.capacity ? parseInt(form.capacity, 10) : undefined;

    if (form.shape === 'goal' && (!amount || amount <= 0))
      return toast.error('Goal amount is required.');
    if (form.shape === 'fixed' && (!amount || amount <= 0))
      return toast.error('Base amount is required for fixed shape.');
    if (form.shape === 'ticketed' && (!amount || amount <= 0))
      return toast.error('Unit price (base amount) is required for ticketed shape.');

    startTransition(async () => {
      const result = await createContribution({
        scopeId: form.scopeId,
        shape: form.shape,
        name: form.name.trim(),
        description: form.description.trim() || null,
        currency: scope.currency,
        openDate: openDate.toISOString(),
        closeDate: closeDate.toISOString(),
        goalAmount: form.shape === 'goal' ? amount : undefined,
        minAmount: form.shape === 'open' && amount ? amount : undefined,
        baseAmount: form.shape === 'fixed' || form.shape === 'ticketed' ? amount : undefined,
        capacity: form.shape === 'ticketed' ? capacity : undefined,
        groupId: groupId ?? undefined,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Contribution created as draft.');
      onDone();
      router.refresh();
    });
  };

  const runApprove = (id: string) => {
    startTransition(async () => {
      const result = await approveContribution(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Contribution approved and open.');
      router.refresh();
    });
  };

  const runClose = (id: string) => {
    startTransition(async () => {
      const result = await closeContribution(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Contribution closed.');
      router.refresh();
    });
  };

  const runExtend = (
    target: ContributionRow,
    dateIso: string,
    reason: string | undefined,
    onDone: () => void,
  ) => {
    if (!dateIso) return toast.error('Pick a new close date.');
    const newClose = new Date(dateIso);
    if (target.closeDate && newClose.getTime() <= new Date(target.closeDate).getTime())
      return toast.error('New close date must be after the current one.');
    startTransition(async () => {
      const result = await extendContribution(target.id, newClose.toISOString(), reason);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Contribution extended.');
      onDone();
      router.refresh();
    });
  };

  const runArchive = (id: string) => {
    startTransition(async () => {
      const result = await archiveContribution(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Contribution archived.');
      router.refresh();
    });
  };

  return { pending, runCreate, runApprove, runClose, runExtend, runArchive };
}
