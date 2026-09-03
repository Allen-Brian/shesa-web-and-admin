'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from '@shesa/ui';

import { approveExpense, recordExpense, reverseExpense } from '../expense-actions';
import type { RecordForm, ScopeOption } from './expenses-types';

interface UseExpensesActionsInput {
  readonly scopeOptions: readonly ScopeOption[];
}

/**
 * Consolidates every expense mutation — record / approve / reverse —
 * behind one hook. Record uses the server-returned status to distinguish
 * ledger-posted from pending_approval; reverse requires a reason that
 * lands in the audit trail.
 */
export function useExpensesActions({ scopeOptions }: UseExpensesActionsInput) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const runRecord = (form: RecordForm, onDone: () => void) => {
    if (!form.scopeId) return toast.error('Pick a scope.');
    if (!form.payee.trim()) return toast.error('Payee is required.');
    const amount = parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a positive amount.');
    const scope = scopeOptions.find((s) => s.id === form.scopeId);
    if (!scope) return toast.error('Invalid scope.');

    startTransition(async () => {
      const result = await recordExpense({
        scopeId: scope.id,
        categoryId: form.categoryId || null,
        payee: form.payee.trim(),
        amount,
        currency: scope.currency,
        description: form.description.trim() || null,
        incurredAt: new Date(form.incurredAt).toISOString(),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const status = result.data?.status;
      toast.success(
        status === 'pending_approval'
          ? 'Expense recorded — waiting for admin approval (above threshold).'
          : 'Expense recorded and posted to the ledger.',
      );
      onDone();
      router.refresh();
    });
  };

  const runApprove = (id: string) => {
    startTransition(async () => {
      const result = await approveExpense(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Expense approved and posted to the ledger.');
      router.refresh();
    });
  };

  const runReverse = (expenseId: string, reason: string, onDone: () => void) => {
    if (!reason.trim()) return toast.error('Reason is required.');
    startTransition(async () => {
      const result = await reverseExpense(expenseId, reason.trim());
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Reversal recorded.');
      onDone();
      router.refresh();
    });
  };

  return { pending, runRecord, runApprove, runReverse };
}
