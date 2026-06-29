/**
 * The runtime environments Shesa ships to.
 *
 * `local` runs against the Supabase CLI Docker stack.
 * `staging` and `production` run against managed Supabase Cloud projects
 * fronted by Cloudflare on a Contabo VPS (Docker Swarm).
 */
export type EnvironmentName = 'local' | 'staging' | 'production';

export const ENVIRONMENT_NAMES = ['local', 'staging', 'production'] as const;
