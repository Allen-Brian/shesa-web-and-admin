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
      staging: 'shesaconnect.com',
      production: 'shesaconnect.com',
    },
    description:
      'Apex domain shared by every Shesa app. Cookie domain is .<APP_BASE_DOMAIN> in staging/prod. Staging and production share the apex (staging uses sibling hostnames like staging-auth.shesaconnect.com), so a cookie set on .shesaconnect.com is visible in both envs — deliberate trade-off documented in memory project_domains.md. Local uses /etc/hosts to map *.shesa.test to 127.0.0.1.',
  },
  {
    name: 'NEXT_PUBLIC_APP_BASE_DOMAIN',
    scope: 'client',
    source: 'derived',
    defaults: {
      local: 'shesa.test',
      staging: 'shesaconnect.com',
      production: 'shesaconnect.com',
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
      staging: 'https://staging.shesaconnect.com',
      production: 'https://shesaconnect.com',
    },
    description:
      'Public website URL. Post-pivot (ADR-0040): stays fully public; no auth-gated routes.',
  },
  {
    name: 'NEXT_PUBLIC_ADMIN_APP_URL',
    scope: 'client',
    source: 'derived',
    defaults: {
      local: 'http://admin.shesa.test:3002',
      staging: 'https://staging-admin.shesaconnect.com',
      production: 'https://admin.shesaconnect.com',
    },
    description:
      'Merged admin app URL (Next.js). Hosts three personas: Exco / Finance / Editor per ADR-0040. Owns its own login pages; no central apps/auth.',
  },
  // Post-pivot: apps/auth, apps/exco, apps/finance retired per ADR-0040.
  // Their per-app URL entries were dropped in the same migration.

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
      staging: 'Shesa Staging <staging@shesaconnect.com>',
      production: 'Shesa <noreply@shesaconnect.com>',
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
  {
    name: 'TRANZAK_MODE',
    scope: 'server',
    source: 'auto',
    defaults: { local: 'sandbox', staging: 'sandbox', production: 'sandbox' },
    description:
      'Which Tranzak environment payments run against. Recorded on every finance.payment_intents row and it decides where a settlement lands: live → finance.payments (ledger, treasury, receipt, immutable), sandbox → finance.sandbox_payments (inert). Production defaults to sandbox until live credentials exist — flipping it is a deliberate act. The credentials themselves are Edge Function secrets, not app env; see supabase/functions/_shared/tranzak-config.ts.',
  },
  {
    name: 'TRANZAK_RETURN_URL_BASE',
    scope: 'server',
    source: 'auto',
    defaults: {
      local: 'http://localhost:3000',
      staging: 'https://www.shesaconnect.com',
      production: 'https://www.shesaconnect.com',
    },
    description:
      "Origin the payer's browser returns to after paying; the code appends the per-transaction path. Distinct from the webhook, which is configured in the Tranzak dashboard and points at an Edge Function. An Edge Function secret, not app env.",
  },
  {
    name: 'TRANZAK_CALLBACK_URL',
    scope: 'server',
    source: 'auto',
    defaults: { local: '', staging: '', production: '' },
    description:
      "Server-to-server notification target sent as `callbackUrl` on request/create. Empty means derive it from SUPABASE_URL, which is the recommended setting — the destination is our own Edge Function, so deriving it cannot drift. Distinct from TRANZAK_RETURN_URL_BASE, which is the payer's browser redirect.",
  },
  {
    name: 'TRANZAK_RECONCILE_SECRET',
    scope: 'server',
    source: 'auto',
    defaults: { local: '', staging: '', production: '' },
    description:
      "Shared secret the scheduled reconciliation sweep sends as `x-worker-secret`. Gates payments/tranzak-reconcile, which polls the gateway for intents that neither the webhook nor the payer's return settled. Without it the endpoint would be open — verify_jwt is a signature check and the anon key is a valid project JWT — letting anyone burn our Tranzak quota. An Edge Function secret; the database also needs it as app.tranzak_reconcile_secret for pg_cron to send it.",
  },
  {
    name: 'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY',
    scope: 'server',
    source: 'auto',
    defaults: {
      // Deterministic 32-byte hex value for local dev — matches across
      // every teammate's laptop so shared branches don't invalidate each
      // other's action IDs. NEVER use this string in staging / production.
      local: '0000000000000000000000000000000000000000000000000000000000000000',
    },
    // `generate` is picked up by the staging/prod checklist emitter to
    // print how to produce a real value for this var.
    generate: 'openssl rand -hex 32',
    description:
      'Server-side key that signs Next.js Server Action IDs. Local: deterministic zero-key so IDs stay stable across dev restarts. Staging/prod: MUST be a fresh 32-byte hex per environment, stored as a GitHub secret; without it, action IDs shift on every deploy and every load-balanced pod, producing the UnrecognizedActionError seen in-app.',
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
