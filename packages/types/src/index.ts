/**
 * @shesa/types — cross-package shared types.
 *
 * This is the root of the type graph: it imports nothing internal.
 * Add a new shared type as `src/<name>.ts` and re-export here.
 */

export * from './environment';
export * from './user-session';
export * from './member-ref';
export * from './scope';
export * from './role-key';
export * from './permission-key';
export * from './permission-checker';
export * from './audit-action';
export * from './audit-logger';
export * from './notification-channel';
