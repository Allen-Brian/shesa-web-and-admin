/**
 * Charge input schemas + shape-specific validators.
 *
 * A charge/contribution row is one primitive with 6 shapes (spec Part II).
 * The DB has CHECK constraints for the shape-specific fields but they
 * fire late and give ugly errors ("check constraint failed"). This
 * module is the earlier, friendlier layer — Server Actions and Edge
 * Functions call it before hitting the DB.
 *
 * The layering is:
 *   1. Zod parses the raw input into a typed value.
 *   2. `validateChargeInput` cross-checks shape-specific rules that
 *      Zod can't easily express (e.g. "goal shape needs goal_amount").
 *   3. Edge Function does the auth + INSERT.
 *
 * Every check here mirrors a DB CHECK constraint from the schema-init
 * migration — the two must stay aligned. When a rule changes, update
 * both.
 */

import { z } from 'zod';

import {
  CHARGE_RECURRENCES,
  CHARGE_SHAPES,
  CONTRIBUTION_LIFECYCLES,
  createsObligations,
  type ChargeShape,
} from './enums';

// ─── Base input shape ──────────────────────────────────────────────────

/**
 * Zod schema for the raw create-charge payload. All fields Zod-typeable;
 * the shape-specific business rules run in validateChargeInput below.
 */
export const chargeInputSchema = z
  .object({
    scopeId: z.string().uuid(),
    categoryId: z.string().uuid().nullable().optional(),
    shape: z.enum(CHARGE_SHAPES),

    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable().optional(),

    baseAmount: z.number().nonnegative().nullable().optional(),
    currency: z
      .string()
      .trim()
      .length(3)
      .regex(/^[A-Z]{3}$/, 'currency must be ISO 4217'),

    recurrence: z.enum(CHARGE_RECURRENCES).default('one_time'),
    recurrenceInterval: z.number().int().positive().default(1),

    // Opaque here — the audience resolver validates the shape at
    // obligation-generation time (M2B). Keep the door open for the
    // shapes M2A doesn't need.
    targetFilter: z.record(z.unknown()).default({}),
    targetPartyType: z.enum(['member', 'branch']).nullable().optional(),

    // Contribution-only fields (nullable for charge shape).
    eventId: z.string().uuid().nullable().optional(),
    openDate: z.string().datetime().nullable().optional(),
    closeDate: z.string().datetime().nullable().optional(),
    goalAmount: z.number().positive().nullable().optional(),
    minAmount: z.number().nonnegative().nullable().optional(),
    capacity: z.number().int().positive().nullable().optional(),
    lifecycle: z.enum(CONTRIBUTION_LIFECYCLES).nullable().optional(),

    // Charge-only.
    issueDate: z.string().datetime().nullable().optional(),
    activationDate: z.string().datetime().nullable().optional(),
  })
  .strict();

export type ChargeInput = z.infer<typeof chargeInputSchema>;

// ─── Shape-specific validation ─────────────────────────────────────────

export interface ValidationIssue {
  readonly field: string;
  readonly message: string;
}

export type ValidateResult =
  { readonly ok: true } | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

/**
 * Cross-check shape-specific rules that Zod can't easily express. Every
 * rule mirrors a DB CHECK from the schema-init migration.
 */
export function validateChargeInput(input: ChargeInput): ValidateResult {
  const issues: ValidationIssue[] = [];
  const shape: ChargeShape = input.shape;

  // Base amount rules.
  if (shape === 'charge' || shape === 'fixed' || shape === 'ticketed') {
    if (input.baseAmount == null || input.baseAmount <= 0) {
      issues.push({
        field: 'baseAmount',
        message: `Shape "${shape}" requires a positive baseAmount.`,
      });
    }
  }
  if (shape === 'goal' || shape === 'open' || shape === 'donation') {
    if (input.baseAmount != null && input.baseAmount !== 0) {
      issues.push({
        field: 'baseAmount',
        message: `Shape "${shape}" must not carry a baseAmount (contributions/donations use goalAmount/minAmount instead).`,
      });
    }
  }

  // Goal amount only on goal shape (matches DB CHECK charges_goal_only_goal_shape).
  if (input.goalAmount != null && shape !== 'goal') {
    issues.push({
      field: 'goalAmount',
      message: `goalAmount is only valid on shape="goal".`,
    });
  }
  if (shape === 'goal' && (input.goalAmount == null || input.goalAmount <= 0)) {
    issues.push({
      field: 'goalAmount',
      message: `Shape "goal" requires a positive goalAmount.`,
    });
  }

  // Capacity only on ticketed (matches DB CHECK charges_capacity_only_ticketed).
  if (input.capacity != null && shape !== 'ticketed') {
    issues.push({
      field: 'capacity',
      message: `capacity is only valid on shape="ticketed".`,
    });
  }

  // Contribution shapes must carry a lifecycle. Charge shape must NOT.
  const isContribution = shape !== 'charge';
  if (isContribution && !input.lifecycle) {
    issues.push({
      field: 'lifecycle',
      message: `Shape "${shape}" requires a lifecycle (draft/open/closed/archived).`,
    });
  }
  if (!isContribution && input.lifecycle) {
    issues.push({
      field: 'lifecycle',
      message: `Shape "charge" must not carry a lifecycle (its dates live on issue_date + activation_date).`,
    });
  }

  // Window sanity — close must be ≥ open when both present.
  if (input.openDate && input.closeDate) {
    if (new Date(input.closeDate).getTime() < new Date(input.openDate).getTime()) {
      issues.push({
        field: 'closeDate',
        message: `closeDate must be on or after openDate.`,
      });
    }
  }

  // Contribution shapes with a bounded window need dates.
  const needsWindow: readonly ChargeShape[] = ['goal', 'open', 'ticketed', 'fixed'];
  if (needsWindow.includes(shape) && (!input.openDate || !input.closeDate)) {
    issues.push({
      field: 'openDate',
      message: `Shape "${shape}" requires openDate + closeDate (bounded window).`,
    });
  }

  // Recurrence + charge shape interlock — non-charge shapes are always one_time.
  if (!createsObligations(shape) && input.recurrence && input.recurrence !== 'one_time') {
    issues.push({
      field: 'recurrence',
      message: `Only shapes that create obligations (charge / fixed) may recur. Shape "${shape}" must use recurrence="one_time".`,
    });
  }

  // Charge shape needs an activation_date — the moment arrears begin.
  if (shape === 'charge' && !input.activationDate) {
    issues.push({
      field: 'activationDate',
      message: `Shape "charge" requires an activationDate (arrears begin at this instant).`,
    });
  }

  // Event tie only on event-typed contribution — deferred to a follow-up
  // once the event ↔ contribution link is wired. For now, eventId is
  // accepted but not required.

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}

// ─── Update schema (draft/paused edits) ────────────────────────────────

/**
 * Update payload — subset of the fields that make sense to edit on a
 * draft or paused charge. Financial fields are frozen once the charge
 * is active (see the DB freeze trigger for obligations; the same
 * principle applies here at the app layer).
 */
export const chargeUpdateSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    targetFilter: z.record(z.unknown()).optional(),
    activationDate: z.string().datetime().nullable().optional(),
    issueDate: z.string().datetime().nullable().optional(),
    openDate: z.string().datetime().nullable().optional(),
    closeDate: z.string().datetime().nullable().optional(),
    status: z.enum(['draft', 'active', 'paused']).optional(),
  })
  .strict();

export type ChargeUpdate = z.infer<typeof chargeUpdateSchema>;
