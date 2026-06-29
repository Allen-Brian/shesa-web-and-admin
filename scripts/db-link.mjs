#!/usr/bin/env node
/**
 * db:link — link the Supabase CLI to a remote project (staging or prod).
 *
 * Usage:
 *   pnpm db:link --env staging
 *   pnpm db:link --env production
 *
 * Reads the project ref from env vars (set per dev or via the org's
 * shared secrets store):
 *
 *   SUPABASE_PROJECT_REF_STAGING
 *   SUPABASE_PROJECT_REF_PROD
 *
 * The link is local to your machine (Supabase CLI stores it in
 * supabase/.temp/, which is .gitignored). Switching between envs means
 * re-running this command; CI does its own link in each workflow.
 *
 * In normal dev you should not need this often — feature/* branches use
 * local Docker, and CI handles `develop`/`main` deploys. Reach for this
 * for breakglass / debugging staging directly / inspecting the prod
 * schema (read-only operations).
 */

import { execSync } from 'node:child_process';

function parseArgs(argv) {
  const args = { env: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--env') args.env = argv[++i];
    else if (a === '-h' || a === '--help') args.help = true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.env) {
  console.log(`
db:link — link Supabase CLI to a remote project.

  pnpm db:link --env staging
  pnpm db:link --env production

Env vars (set yours from a shared secrets store before running):
  SUPABASE_PROJECT_REF_STAGING   the staging project ref (from cloud.supabase.com)
  SUPABASE_PROJECT_REF_PROD      the prod project ref
`);
  process.exit(args.help ? 0 : 1);
}

const refEnvVar =
  args.env === 'production' ? 'SUPABASE_PROJECT_REF_PROD' : 'SUPABASE_PROJECT_REF_STAGING';
const ref = process.env[refEnvVar];

if (!ref) {
  console.error(`✗ ${refEnvVar} is not set. Set it from your shared secrets store and try again:`);
  console.error(`    export ${refEnvVar}=<your-project-ref>`);
  console.error(
    `  Find your project ref at https://supabase.com/dashboard → your project → Settings → General.`,
  );
  process.exit(2);
}

if (args.env === 'production') {
  console.warn(
    '⚠  Linking to PRODUCTION. Read-only operations are fine; treat any write/push as a deploy.',
  );
}

try {
  execSync(`pnpm supabase link --project-ref ${ref}`, { stdio: 'inherit' });
  console.log(`\n✓ linked to ${args.env} (ref: ${ref})`);
  console.log(`  Next: \`pnpm db:diff:remote\` to compare; \`pnpm db:push\` to apply migrations.`);
} catch (err) {
  console.error('✗ supabase link failed. See output above.');
  process.exit(err.status ?? 1);
}
