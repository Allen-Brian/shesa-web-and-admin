/**
 * Scopes domain — helpers for the org hierarchy (Mainstream → Branch →
 * Chapter → Batch → House, plus Sector cutting across).
 *
 * E1 stub. Filled in during E2 (Supabase schemas) when the actual
 * `core.scopes` table lands, and refined in E3 when scope-aware
 * permission resolution joins it.
 *
 * The `ScopeType` literal and `ScopeRef` shape are already in
 * `@shesa/types` — re-exported here for ergonomic imports.
 */

export type { ScopeType, ScopeRef } from '@shesa/types';
export { SCOPE_TYPES } from '@shesa/types';
