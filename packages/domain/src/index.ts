/**
 * @shesa/domain — business rules, validators, utils.
 *
 * Subpath exports are the preferred import shape (e.g.
 * `@shesa/domain/validators`, `@shesa/domain/errors`) so apps and Server
 * Actions only pull what they actually use and tree-shaking stays clean.
 *
 * This barrel re-exports the small, always-useful pieces; the heavier
 * subfolders (rbac, audit, notifications, scopes) deliberately live
 * behind subpath imports.
 */

export * from './errors';
export * from './validators';
export * from './utils';
