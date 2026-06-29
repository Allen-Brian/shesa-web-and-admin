#!/usr/bin/env node
/**
 * db:push — apply local migrations to the linked Supabase Cloud project.
 *
 * Usage:
 *   pnpm db:link --env staging && pnpm db:push
 *   pnpm db:link --env production && pnpm db:push --confirm
 *
 * Safety rails:
 *   - Refuses if no link exists (run `pnpm db:link` first).
 *   - When the linked project is production, requires `--confirm` AND a
 *     typed "PRODUCTION" confirmation. Refuses to push from a feature
 *     branch — only `develop` (→ staging) or `main` (→ prod). CI does
 *     the normal path; this command is for breakglass.
 *   - Prints the diff before pushing so you see what's about to apply.
 *
 * Why a script instead of a one-liner npm alias: `supabase db push` is
 * idempotent and safe in most cases, but it CAN drop tables / data when
 * the local migration history diverges from the remote. The wrapper
 * surfaces what's about to happen instead of letting `pnpm db:push`
 * silently rewrite production.
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`
db:push — push migrations to the linked Supabase Cloud project.

  pnpm db:link --env staging && pnpm db:push
  pnpm db:link --env production && pnpm db:push --confirm

Flags:
  --confirm    required for production. Will still prompt for a typed
               "PRODUCTION" confirmation.
  --dry-run    print the diff against remote, then exit without pushing.
`);
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────
// 1. Detect link + branch
// ─────────────────────────────────────────────────────────────────────
const linkedRef = detectLinkedProjectRef();
if (!linkedRef) {
  console.error(
    '✗ no Supabase project linked. Run `pnpm db:link --env <staging|production>` first.',
  );
  process.exit(1);
}

const branch = currentBranch();
const looksLikeProd = linkedRef === process.env.SUPABASE_PROJECT_REF_PROD || branch === 'main';

console.log(`Linked project ref:  ${linkedRef}`);
console.log(`Current git branch:  ${branch}`);
console.log(`Target appears to be: ${looksLikeProd ? 'PRODUCTION' : 'staging'}\n`);

// ─────────────────────────────────────────────────────────────────────
// 2. Show the diff first — what's about to be applied
// ─────────────────────────────────────────────────────────────────────
console.log('--- Diff against remote (what will be applied) ---');
try {
  execSync('pnpm supabase db diff --linked', { stdio: 'inherit' });
} catch {
  console.error('\n✗ could not compute diff. Aborting push.');
  process.exit(2);
}

if (args.dryRun) {
  console.log('\n(--dry-run) exiting without pushing.');
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────
// 3. Branch guard — never push from a feature branch
// ─────────────────────────────────────────────────────────────────────
if (branch !== 'develop' && branch !== 'main' && !args.force) {
  console.error(
    `\n✗ refusing to push from branch "${branch}". Push only from develop or main, or pass --force.`,
  );
  console.error('  (CI is the normal path — manual push is for breakglass.)');
  process.exit(3);
}

// ─────────────────────────────────────────────────────────────────────
// 4. Production safety
// ─────────────────────────────────────────────────────────────────────
if (looksLikeProd) {
  if (!args.confirm) {
    console.error('\n✗ pushing to production requires --confirm.');
    console.error('  Example: pnpm db:push --confirm');
    process.exit(4);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const typed = await rl.question('Type the word PRODUCTION to confirm: ');
  rl.close();
  if (typed.trim() !== 'PRODUCTION') {
    console.error('✗ confirmation failed. Aborting.');
    process.exit(5);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 5. Push
// ─────────────────────────────────────────────────────────────────────
try {
  execSync('pnpm supabase db push --linked', { stdio: 'inherit' });
  console.log('\n✓ migrations pushed.');
  if (!looksLikeProd) {
    console.log(
      '\nReminder: seed.sql is NOT auto-applied by db:push. To seed staging fixtures, run:',
    );
    console.log('  pnpm supabase db reset --linked   # WARNING: drops all data on the remote');
    console.log(
      '  ... or apply seed.sql manually via the Supabase SQL editor for safer additive seeding.',
    );
  }
} catch (err) {
  console.error('\n✗ db push failed. See output above.');
  process.exit(err.status ?? 6);
}

// ─────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const a = { confirm: false, dryRun: false, force: false, help: false };
  for (const arg of argv) {
    if (arg === '--confirm') a.confirm = true;
    else if (arg === '--dry-run') a.dryRun = true;
    else if (arg === '--force') a.force = true;
    else if (arg === '-h' || arg === '--help') a.help = true;
  }
  return a;
}

function currentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Returns the project_ref from supabase/.temp/project-ref if linked,
 * or null otherwise. The CLI stores the link there.
 */
function detectLinkedProjectRef() {
  const path = 'supabase/.temp/project-ref';
  if (!existsSync(path)) return null;
  const ref = readFileSync(path, 'utf8').trim();
  return ref || null;
}
