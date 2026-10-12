/**
 * Raw row shapes for the exco dashboard loader — mirror the columns
 * each Supabase query selects. Kept in one place so the loader + every
 * downstream derivation share the same view.
 */

export interface RawScope {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly scope_type: string;
  readonly chapter_kind: string | null;
  readonly parent_scope_id: string | null;
}

export interface RawBranch {
  readonly scope_id: string;
  readonly city: string;
  readonly region: string;
  readonly country_code: string;
}

export interface RawMember {
  readonly id: string;
  readonly full_name: string;
  readonly current_city: string | null;
  readonly current_country: string | null;
  readonly created_at: string;
  readonly network_scope_id: string | null;
  readonly house_scope_id: string | null;
}

export interface RawMembership {
  readonly member_id: string;
  readonly scope_id: string;
  readonly membership_status: string;
  readonly engagement: string | null;
  readonly joined_at: string | null;
}

export interface RawEvent {
  readonly id: string;
  readonly owner_scope_id: string;
  readonly name: string;
  readonly start_at: string;
  readonly end_at: string;
  readonly venue_name: string | null;
  readonly online_url: string | null;
  readonly types: string[];
  readonly status: string;
}

export interface RawAnnouncement {
  readonly id: string;
  readonly owner_scope_id: string;
  readonly title: string;
  readonly body: string;
  readonly published_at: string | null;
  readonly status: string;
}

export interface RawCharge {
  readonly id: string;
  readonly scope_id: string;
  readonly name: string;
  readonly shape: string;
  readonly base_amount: number | null;
  readonly goal_amount: string | null;
  readonly currency: string;
  readonly status: string;
  readonly lifecycle: string | null;
  readonly close_date: string | null;
  readonly recurrence: string;
}

export interface RawObligation {
  readonly id: string;
  readonly charge_id: string;
  readonly scope_id: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: string;
  readonly period_start: string | null;
}

export interface RawPayment {
  readonly id: string;
  readonly charge_id: string | null;
  readonly obligation_id: string | null;
  readonly scope_id: string;
  readonly payer_member_id: string | null;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  readonly source: string;
  readonly reverses_payment_id: string | null;
  readonly created_at: string;
  readonly metadata: Record<string, unknown> | null;
}

export interface DashboardRawData {
  readonly scopes: readonly RawScope[];
  readonly branches: readonly RawBranch[];
  readonly members: readonly RawMember[];
  readonly memberships: readonly RawMembership[];
  readonly events: readonly RawEvent[];
  readonly announcements: readonly RawAnnouncement[];
  readonly charges: readonly RawCharge[];
  readonly obligations: readonly RawObligation[];
  readonly payments: readonly RawPayment[];
}
