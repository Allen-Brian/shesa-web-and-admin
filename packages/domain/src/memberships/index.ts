/**
 * Memberships domain — Phase 1 + Phase 2 helpers.
 *
 * Pure functions describing legality + display invariants for
 * memberships: transfers, passive-status toggles, engagement tier
 * ladder, and initial registration-state resolution.
 *
 * Shape checks only — authorization and DB writes live in the Edge
 * Functions.
 */

export * from './transfer-rules';
export * from './passive-rules';
export * from './engagement';
export * from './initial-registration';
