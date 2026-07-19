import type {
  DashboardRawData,
  RawAnnouncement,
  RawCharge,
  RawEvent,
  RawMembership,
  RawObligation,
  RawPayment,
  RawScope,
} from './dashboard-loader-types';
import type { DashboardPersona } from './dashboard-persona';

export interface DashboardScopeContext {
  readonly scopeById: Map<string, RawScope>;
  readonly inScope: (scopeId: string) => boolean;
  readonly scopedMemberships: readonly RawMembership[];
  readonly scopedEvents: readonly RawEvent[];
  readonly scopedAnnouncements: readonly RawAnnouncement[];
  readonly scopedCharges: readonly RawCharge[];
  readonly scopedObligations: readonly RawObligation[];
  readonly scopedPayments: readonly RawPayment[];
}

/**
 * Build the persona-aware scope lens. Global admins see everything;
 * scoped admins only see rows whose scope_id (or owner_scope_id) is in
 * their live-grant set.
 */
export function buildDashboardScopeContext(
  raw: DashboardRawData,
  persona: DashboardPersona,
): DashboardScopeContext {
  const scopeById = new Map(raw.scopes.map((s) => [s.id, s]));
  const myScopeIds = persona.myScopeIds;
  const inScope = (scopeId: string): boolean =>
    persona.isGlobalAdmin || myScopeIds.includes(scopeId);

  return {
    scopeById,
    inScope,
    scopedMemberships: raw.memberships.filter((m) => inScope(m.scope_id)),
    scopedEvents: raw.events.filter((e) => inScope(e.owner_scope_id)),
    scopedAnnouncements: raw.announcements.filter((a) => inScope(a.owner_scope_id)),
    scopedCharges: raw.charges.filter((c) => inScope(c.scope_id)),
    scopedObligations: raw.obligations.filter((o) => inScope(o.scope_id)),
    scopedPayments: raw.payments.filter((p) => inScope(p.scope_id)),
  };
}
