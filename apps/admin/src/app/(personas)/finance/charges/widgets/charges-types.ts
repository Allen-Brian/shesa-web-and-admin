/**
 * Shared row + form shapes for the finance charges view. Kept in a
 * plain file so the server-side page loader and every widget sibling
 * can import from one source.
 */

export interface ChargeRow {
  readonly id: string;
  readonly scopeId: string;
  readonly scopeName: string;
  readonly scopeSlug: string;
  readonly name: string;
  readonly description: string | null;
  readonly shape: string;
  readonly baseAmount: number | null;
  readonly currency: string;
  readonly recurrence: string;
  readonly recurrenceInterval: number;
  readonly status: string;
  readonly activationDate: string | null;
  readonly createdAt: string;
  /** Sum of open obligation amounts on this charge. */
  readonly expected: number;
  /** Sum of settled payments (minus reversals). */
  readonly collected: number;
}

export interface ScopeOption {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly currency: string;
  readonly scopeType: string;
}

export type SerialRow = ChargeRow & { readonly serial: number };

export type StatusFilter = 'all' | ChargeRow['status'];
export type ShapeFilter = 'all' | 'charge' | 'fixed';

export const RECURRENCES = [
  { value: 'one_time', label: 'One-time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'biannual', label: 'Bi-annual' },
  { value: 'yearly', label: 'Yearly' },
] as const;

export type Recurrence = (typeof RECURRENCES)[number]['value'];

export interface CreateForm {
  scopeId: string;
  name: string;
  description: string;
  baseAmount: string;
  recurrence: Recurrence;
  activationDate: string;
}

export interface EditForm {
  id: string;
  name: string;
  description: string;
  activationDate: string;
  status: 'draft' | 'active' | 'paused';
}
