/**
 * @shesa/config — runtime configuration.
 *
 * IMPORTANT: this barrel exports both server-only and client-safe helpers.
 *
 *   - Importing `@shesa/config/env.server` is fine ONLY in server code
 *     (Server Actions, Route Handlers, Edge Functions, scripts). It will
 *     throw at module load if any server-only env var is missing.
 *   - Importing `@shesa/config/env.client` is safe anywhere — its schema
 *     validates `NEXT_PUBLIC_*` vars only.
 *   - Importing `@shesa/config/urls` is safe anywhere — it derives public
 *     URLs from `clientEnv`.
 *
 * Importing the top-level `@shesa/config` is intentionally not re-exporting
 * `env.server` so a client bundle accidentally pulling `@shesa/config` does
 * not get bundled with server secrets.
 */

export { clientEnv } from './env.client';
export type { ClientEnv } from './env.client';
export * from './urls';
