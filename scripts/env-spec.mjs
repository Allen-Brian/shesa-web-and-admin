/**
 * Single source of truth for every environment variable Shesa needs.
 *
 * Consumed by:
 *   - scripts/env-init.mjs   (writes .env.local for a dev's machine)
 *   - scripts/env-check.mjs  (audits GitHub Actions secrets for staging/prod)
 *
 * Adding a new env var means editing THIS file, then:
 *   - extending the Zod schemas in packages/config/src/env.{server,client}.ts
 *   - if it's a staging/prod secret, running `gh secret set <NAME>` per env
 *
 * Spec shape:
 *
 *   {
 *     name: 'SUPABASE_URL',
 *     scope: 'server' | 'client',       // client → must start with NEXT_PUBLIC_
 *     source: 'auto' | 'supabase' | 'user' | 'derived',
 *       // auto      → we generate a default
 *       // supabase  → captured from `supabase status` output
 *       // user      → developer must provide (external service, secret)
 *       // derived   → computed from another var (e.g. URL from APP_BASE_DOMAIN)
 *     defaults?: { local?, staging?, production? },
 *     description: 'one-liner; appears as a comment above the var in .env'
 *   }
 *
 * Order matters in this file — vars are written to .env files in the
 * order listed, grouped by section header. Keep groups cohesive.
 */

export const ENVS = ['local', 'staging', 'production'];

export const ENV_VARS = [
  // ───────────────────────────────────────────────────────────────────
  // SECTION: Runtime identity
  // ───────────────────────────────────────────────────────────────────
  {
    name: 'APP_ENV',
    scope: 'server',
    source: 'auto',
    defaults: { local: 'local', staging: 'staging', production: 'production' },
    description: 'Runtime env name — local | staging | production.',
  },
  {
    name: 'NEXT_PUBLIC_APP_ENV',
    scope: 'client',
    source: 'auto',
    defaults: { local: 'local', staging: 'staging', production: 'production' },
    description: 'Client-side mirror of APP_ENV (needed in the browser bundle).',
  },

  // ───────────────────────────────────────────────────────────────────
  // SECTION: Apex domain (drives cookie scope for cross-subdomain SSO)
  // ───────────────────────────────────────────────────────────────────
  {
    name: 'APP_BASE_DOMAIN',
    scope: 'server',
    source: 'auto',
    defaults: {
      local: 'shesa.test',
      staging: 'staging.shesa.org',
      production: 'shesa.org',
    },
    description:
      'Apex domain shared by every Shesa app. Cookie domain is .<APP_BASE_DOMAIN> in staging/prod. Local uses /etc/hosts to map *.shesa.test to 127.0.0.1.',
  },
  {
    name: 'NEXT_PUBLIC_APP_BASE_DOMAIN',
    scope: 'client',
    source: 'derived',
    defaults: {
      local: 'shesa.test',
      staging: 'staging.shesa.org',
      production: 'shesa.org',
    },
    description: 'Client-side mirror of APP_BASE_DOMAIN.',
  },

  // ───────────────────────────────────────────────────────────────────
  // SECTION: Per-app URLs (the apps reference each other for redirects)
  // ───────────────────────────────────────────────────────────────────
  {
    name: 'NEXT_PUBLIC_WEB_APP_URL',
    scope: 'client',
    source: 'derived',
    defaults: {
      local: 'http://web.shesa.test:3000',
      staging: 'https://staging.shesa.org',
      production: 'https://shesa.org',
    },
    description: 'Public website URL.',
  },
  {
    name: 'NEXT_PUBLIC_AUTH_APP_URL',
    scope: 'client',
    source: 'derived',
    defaults: {
      local: 'http://auth.shesa.test:3001',
      staging: 'https://auth.staging.shesa.org',
      production: 'https://auth.shesa.org',
    },
    description: 'Central auth app URL (login / logout / invite callbacks).',
  },
  {
    name: 'NEXT_PUBLIC_EXCO_APP_URL',
    scope: 'client',
    source: 'derived',
    defaults: {
      local: 'http://exco.shesa.test:3002',
      staging: 'https://exco.staging.shesa.org',
      production: 'https://exco.shesa.org',
    },
    description: 'Executive Committee dashboard URL.',
  },
  {
    name: 'NEXT_PUBLIC_FINANCE_APP_URL',
    scope: 'client',
    source: 'derived',
    defaults: {
      local: 'http://finance.shesa.test:3003',
      staging: 'https://finance.staging.shesa.org',
      production: 'https://finance.shesa.org',
    },
    description: 'Finance app URL.',
  },
  // apps/connect was dropped from Phase 0; restore this entry if it
  // returns later — paired removal in packages/config/src/env.client.ts.

  // ───────────────────────────────────────────────────────────────────
  // SECTION: Supabase  (per-env; local values captured from `supabase status`)
  // ───────────────────────────────────────────────────────────────────
  {
    name: 'SUPABASE_URL',
    scope: 'server',
    source: 'supabase',
    defaults: { local: 'http://127.0.0.1:54321' },
    description:
      'Supabase project URL. Local: from `supabase start` output (auto-captured). Staging/prod: copy from your Supabase project dashboard.',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    scope: 'client',
    source: 'supabase',
    defaults: { local: 'http://127.0.0.1:54321' },
    description: 'Client mirror of SUPABASE_URL.',
  },
  {
    name: 'SUPABASE_ANON_KEY',
    scope: 'server',
    source: 'supabase',
    description:
      'Public Supabase anon key. Local: from `supabase status`. Per-env from dashboard otherwise.',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    scope: 'client',
    source: 'supabase',
    description: 'Client mirror of SUPABASE_ANON_KEY.',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    scope: 'server',
    source: 'supabase',
    description:
      'SECRET. Bypasses RLS. Never expose to client. Local: from `supabase status`. Staging/prod: from Supabase dashboard → Project Settings → API.',
  },
  {
    name: 'SUPABASE_DB_URL',
    scope: 'server',
    source: 'supabase',
    defaults: { local: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' },
    description: 'Direct Postgres connection URL (for migrations, pg_cron setup). Server-only.',
  },

  // ───────────────────────────────────────────────────────────────────
  // SECTION: External services (user must obtain)
  // ───────────────────────────────────────────────────────────────────
  {
    name: 'RESEND_API_KEY',
    scope: 'server',
    source: 'user',
    description:
      'SECRET. Resend API key for outbound mail. Obtain from https://resend.com → API Keys. Use a sandbox key for local; per-env keys for staging/prod.',
  },
  {
    name: 'EMAIL_FROM',
    scope: 'server',
    source: 'auto',
    defaults: {
      local: 'Shesa Dev <dev@shesa.test>',
      staging: 'Shesa <noreply@staging.shesa.org>',
      production: 'Shesa <noreply@shesa.org>',
    },
    description:
      'Default From: address for outbound mail. Must match a verified Resend domain in staging/prod.',
  },
  {
    name: 'SMS_PROVIDER_MODE',
    scope: 'server',
    source: 'auto',
    defaults: { local: 'stub', staging: 'stub', production: 'stub' },
    description:
      'SMS provider mode. `stub` logs to console without sending. `live` enabled per-phase once a Cameroon-capable provider is wired (Phase 6).',
  },
];

/**
 * Group vars for readable .env output. Each var's section comes from a
 * banner in the spec above; this helper reverses that into a structured
 * list the writer can iterate.
 */
export function varsByScope(scope) {
  return ENV_VARS.filter((v) => v.scope === scope);
}

export function requiredFromUser(env) {
  return ENV_VARS.filter((v) => {
    if (v.source !== 'user') return false;
    // staging/prod treat every supabase-sourced var as user-provided too
    // (the dashboard, not `supabase status`).
    return true;
  });
}

export function autoGenerableFor(env) {
  return ENV_VARS.filter((v) => {
    if (v.source === 'auto' || v.source === 'derived') {
      return v.defaults && v.defaults[env] !== undefined;
    }
    if (v.source === 'supabase' && env === 'local') {
      // Captured from `supabase status`; counts as auto-generable for local.
      return true;
    }
    return false;
  });
}
