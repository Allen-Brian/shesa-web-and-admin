/**
 * Finance domain — Phase 3 helpers.
 *
 * TypeScript mirrors of the Postgres enums from the finance schema,
 * shape predicates (createsObligations, isFinanceBearing, isExtended),
 * priority bands for the exception resolver, and the PaymentProvider
 * seam with its SimulatedProvider implementation.
 *
 * Full spec: docs/product/finance.md.
 * Locked decisions: memory/project_phase3_finance_locks.md.
 *
 * The heavy Phase 3 helpers (obligation generation, exception resolver,
 * treasury journal writer, currency conversion) live under milestone-
 * specific subpaths as they land in M2 through M11.
 */

export * from './enums';
export * from './payment-provider';
export * from './charges';
export * from './periods';
export * from './proration';
export * from './payments';
