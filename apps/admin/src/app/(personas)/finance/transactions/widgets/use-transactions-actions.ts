'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from '@shesa/ui';

import {
  markReconciled,
  recordManualPayment,
  reversePayment,
  undoReconciliation,
} from '../transaction-actions';
import type { ChargeOption, RecordForm } from './transactions-types';

interface UsePaymentsActionsInput {
  readonly chargeOptions: readonly ChargeOption[];
}

/**
 * Mutation hook for the payments view: record a manual payment,
 * reverse an existing one. Each action validates client-side, awaits
 * the server action, toasts, and refreshes on success. Keeps toast +
 * router.refresh out of the view so the orchestrator stays layout-
 * focused.
 */
export function useTransactionsActions({ chargeOptions }: UsePaymentsActionsInput) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const runRecord = (form: RecordForm, onDone: () => void) => {
    if (!form.chargeId) return toast.error('Pick a charge.');
    const amount = parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a positive amount.');
    const charge = chargeOptions.find((c) => c.id === form.chargeId);
    if (!charge) return toast.error('Invalid charge.');

    startTransition(async () => {
      const result = await recordManualPayment({
        chargeId: charge.id,
        amount,
        currency: charge.currency,
        method: form.method,
        memo: form.memo.trim() || undefined,
        externalRef: form.externalRef.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Payment recorded.');
      onDone();
      router.refresh();
    });
  };

  const runReverse = (paymentId: string, reason: string, onDone: () => void) => {
    if (!reason.trim()) return toast.error('Reason is required.');
    startTransition(async () => {
      const result = await reversePayment(paymentId, reason.trim());
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Reversal recorded.');
      onDone();
      router.refresh();
    });
  };

  const runReconcile = (
    paymentIds: readonly string[],
    matchedRef: string | null,
    notes: string | null,
    onDone: () => void,
  ) => {
    if (paymentIds.length === 0) return;
    startTransition(async () => {
      const result = await markReconciled(paymentIds, matchedRef, notes);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(
        paymentIds.length === 1
          ? 'Transaction reconciled.'
          : `${paymentIds.length} transactions reconciled.`,
      );
      onDone();
      router.refresh();
    });
  };

  const runUndoReconciliation = (paymentIds: readonly string[], onDone: () => void) => {
    if (paymentIds.length === 0) return;
    startTransition(async () => {
      const result = await undoReconciliation(paymentIds);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(
        paymentIds.length === 1
          ? 'Reconciliation undone.'
          : `${paymentIds.length} reconciliations undone.`,
      );
      onDone();
      router.refresh();
    });
  };

  return { pending, runRecord, runReverse, runReconcile, runUndoReconciliation };
}
