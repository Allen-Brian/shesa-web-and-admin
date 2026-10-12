/**
 * Raw DB row shapes for the charge-detail loader. Kept plain (no
 * `server-only`) so the shared aggregator helpers stay portable and
 * unit-testable.
 */

export interface RawCharge {
  readonly id: string;
  readonly scope_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly shape: string;
  readonly base_amount: number | null;
  readonly goal_amount: string | null;
  readonly currency: string;
  readonly recurrence: string;
  readonly recurrence_interval: number;
  readonly status: string;
  readonly lifecycle: string | null;
  readonly activation_date: string | null;
  readonly open_date: string | null;
  readonly close_date: string | null;
  readonly created_at: string;
}

export interface RawObligation {
  readonly id: string;
  readonly charge_id: string;
  readonly party_type: string;
  readonly party_id: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: string;
  readonly period_start: string | null;
  readonly period_end: string | null;
  readonly prorated: boolean;
}

export interface RawPayment {
  readonly id: string;
  readonly obligation_id: string | null;
  readonly charge_id: string | null;
  readonly payer_member_id: string | null;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  readonly source: string;
  readonly reverses_payment_id: string | null;
  readonly external_ref?: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly created_at: string;
}
