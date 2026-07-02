/**
 * Memberships domain — Phase 1 E1.4 helpers.
 *
 * Pure functions describing legality invariants for transfers and
 * passive-status toggles. Shape checks only — authorization and DB
 * writes live in the Edge Functions.
 */

export * from './transfer-rules';
export * from './passive-rules';
