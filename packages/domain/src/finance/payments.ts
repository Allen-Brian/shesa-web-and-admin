/**
 * Payment input schemas.
 *
 * The DB's finance.payments row is append-only (M1 trigger). Every
 * incoming payment maps to exactly one INSERT — no edits, ever. This
 * module is the Zod-typed input layer for the four M4 edge functions:
 *   record-manual   — cash / bank transfer / on-site collection.
 *   pay-on-behalf   — Finance or Admin records for a member.
 *   reverse         — inserts a new row with reverses_payment_id set.
 *   confirm         — writes the row when SimulatedProvider.confirm ok's.
 *
 * "Amount is always positive on the row" (M1 CHECK amount > 0).
 * Reversals negate at query time via reverses_payment_id — never with a
 * negative amount.
 */

import { z } from 'zod';

import { PAYMENT_METHODS, PAYMENT_SOURCES } from './enums';

// ─── Manual record ─────────────────────────────────────────────────────

/**
 * Input for record-manual. Exactly one of obligationId or chargeId must
 * be supplied — the DB CHECK payments_targets_something enforces the
 * same rule, but rejecting at the app layer gives a friendlier error.
 */
export const recordManualPaymentSchema = z
  .object({
    obligationId: z.string().uuid().optional(),
    chargeId: z.string().uuid().optional(),
    payerMemberId: z.string().uuid().optional(),
    amount: z.number().positive(),
    currency: z
      .string()
      .length(3)
      .regex(/^[A-Z]{3}$/),
    method: z.enum(PAYMENT_METHODS),
    memo: z.string().trim().max(500).optional(),
    externalRef: z.string().trim().max(200).optional(),
  })
  .strict()
  .refine((v) => !!v.obligationId || !!v.chargeId, {
    message: 'One of obligationId or chargeId must be provided.',
    path: ['obligationId'],
  });

export type RecordManualPaymentInput = z.infer<typeof recordManualPaymentSchema>;

// ─── Pay on behalf ─────────────────────────────────────────────────────

/**
 * Pay-on-behalf: caller (Finance or Admin) records a payment for a
 * member. The payment attaches to the member (payerMemberId is required
 * and represents the person the payment is FOR, not the actor recording
 * it — recorded_by captures the actor).
 */
export const payOnBehalfSchema = z
  .object({
    obligationId: z.string().uuid().optional(),
    chargeId: z.string().uuid().optional(),
    beneficiaryMemberId: z.string().uuid(),
    amount: z.number().positive(),
    currency: z
      .string()
      .length(3)
      .regex(/^[A-Z]{3}$/),
    method: z.enum(PAYMENT_METHODS),
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((v) => !!v.obligationId || !!v.chargeId, {
    message: 'One of obligationId or chargeId must be provided.',
    path: ['obligationId'],
  });

export type PayOnBehalfInput = z.infer<typeof payOnBehalfSchema>;

// ─── Reverse ───────────────────────────────────────────────────────────

/**
 * Reversal: inserts a NEW payment row with reverses_payment_id set
 * and a mandatory reversal_reason. The original payment stays intact
 * (append-only). Net-effect queries treat the pair as cancelling out.
 * Amount stays positive on the row; the "negation" is expressed via the
 * reverses_payment_id link, not a signed amount.
 */
export const reversePaymentSchema = z
  .object({
    originalPaymentId: z.string().uuid(),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export type ReversePaymentInput = z.infer<typeof reversePaymentSchema>;

// ─── Payment source resolution ─────────────────────────────────────────

/**
 * All manual + on-behalf + reverse writes carry source='manual' — a
 * human is the direct cause. Confirmed provider payments (M4B) carry
 * source='auto'. This resolver keeps the two writers from disagreeing
 * on the label.
 */
export function resolvePaymentSource(
  entryPoint: 'manual' | 'on_behalf' | 'reverse' | 'confirmed',
): (typeof PAYMENT_SOURCES)[number] {
  return entryPoint === 'confirmed' ? 'auto' : 'manual';
}
