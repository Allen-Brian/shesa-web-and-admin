/**
 * Entity Edge Function: expenses/
 *
 * Serves /functions/v1/expenses/{action}. Per ADR-0033, every write to
 * finance.expenses lands here — Server Actions cannot mutate the table
 * directly. The M1 freeze trigger + M7 append-only pattern hold at the
 * DB level regardless.
 *
 * Actions:
 *   record   — Finance records an expense. Below the body's threshold
 *              (or no threshold): status='recorded' → M7 INSERT trigger
 *              writes the ledger immediately. Above: status='pending_
 *              approval' → waits for Admin's approve.
 *   approve  — Admin (President) approves an above-threshold expense.
 *              Transition pending_approval → approved fires the M7
 *              UPDATE trigger which writes the ledger.
 *   reverse  — Inserts a new expense row with reverses_expense_id set
 *              + a mandatory reason. status='recorded' so the M7
 *              trigger writes a direction='income' ledger row that
 *              cancels out the original's outflow.
 *
 * Deferred to a follow-up:
 *   settings — set / clear the per-body approval threshold. For now
 *              admins can manage the row via a direct supabase-js call
 *              (RLS admits INSERT/UPDATE for holders of
 *              expense_settings.manage per M1 policies).
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { approveExpense } from './approve.ts';
import { recordExpense } from './record.ts';
import { reverseExpense } from './reverse.ts';

Deno.serve(
  entityRouter({
    record: recordExpense,
    approve: approveExpense,
    reverse: reverseExpense,
  }),
);
