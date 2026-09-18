#!/usr/bin/env node
/**
 * db — one entry point for every database command, against either target.
 *
 *     pnpm db <command> [--target local|production] [flags]
 *
 * ─── The problem this solves ────────────────────────────────────────
 * The Supabase CLI decides what it is talking to by remembered state:
 * whichever project you last ran `supabase link` against, stored in
 * `supabase/.temp/`. Nothing in a command tells you which database it is
 * about to touch, and nothing stops `db reset` — which DROPS EVERYTHING —
 * from landing on production because you linked it an hour ago and forgot.
 *
 * This wrapper makes the target explicit on every invocation, prints it
 * before doing anything, and re-links to match. There is no ambiguity and
 * no memory.
 *
 * ─── Choosing a target ──────────────────────────────────────────────
 *   1. `--target production` on the command line, else
 *   2. the SHESA_DB_TARGET environment variable, else
 *   3. `local`.
 *
 * Local is the default deliberately: the safe target is the one you get
 * when you have not thought about it.
 *
 *     pnpm db reset                          # local
 *     pnpm db push --target production       # production, with prompts
 *     SHESA_DB_TARGET=production pnpm db diff
 *
 * Production credentials come from `.env.production` (SUPABASE_DB_URL,
 * SUPABASE_PROJECT_REF_PROD) — never from `.env.local`.
 *
 * ─── Safety ─────────────────────────────────────────────────────────
 * Commands are classified. Anything that can destroy data refuses to run
 * against production without `--confirm` AND a typed project ref, and
 * `reset` refuses outright — a production rebuild goes through
 * docs/runbooks/prod-database-reset.md, which has the backup and
 * verification steps this wrapper cannot enforce.
 */

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

const TARGETS = ['local', 'production'];

/**
 * command → { run, safety, help }
 *
 * safety:
 *   'safe'        — read-only or local-only side effects
 *   'writes'      — mutates the target; production needs --confirm
 *   'local-only'  — refuses to run against production at all
 */
const COMMANDS = {
  start: { safety: 'local-only', help: 'start the local Supabase stack' },
  stop: { safety: 'local-only', help: 'stop the local stack' },
  status: { safety: 'local-only', help: 'show local stack status + keys' },
  test: { safety: 'local-only', help: 'run the pgTAP suite' },
  reset: {
    safety: 'local-only',
    help: 'drop and rebuild from migrations + seeds (LOCAL ONLY — see the runbook for production)',
  },
  diff: { safety: 'safe', help: 'show schema drift between migrations and the target' },
  types: { safety: 'safe', help: 'regenerate packages/supabase/src/types.gen.ts from the target' },
  lint: { safety: 'safe', help: 'run the Supabase schema linter' },
  push: { safety: 'writes', help: 'apply pending migrations to the target' },
  seed: { safety: 'writes', help: 'apply supabase/seed.sql to the target' },
  'seed-demo': {
    safety: 'local-only',
    help: 'apply supabase/seed-demo.sql (dev fixtures — never production)',
  },
};

/** Every schema the Data API exposes. Keep in step with config.toml [api].schemas. */
const TYPED_SCHEMAS = [
  'public',
  'core',
  'audit',
  'notifications',
  'exco',
  'finance',
  'cms',
  'awards',
];

// ─────────────────────────────────────────────────────────────────────
// Arguments
// ─────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const command = argv.find((a) => !a.startsWith('-')) ?? null;
const flags = {
  target: readFlag(argv, '--target') ?? process.env.SHESA_DB_TARGET ?? 'local',
  confirm: argv.includes('--confirm'),
  help: argv.includes('-h') || argv.includes('--help'),
};

if (flags.help || !command) {
  usage();
  process.exit(command ? 0 : 1);
}

if (!COMMANDS[command]) {
  console.error(`✗ unknown command "${command}"`);
  usage();
  process.exit(1);
}

if (!TARGETS.includes(flags.target)) {
  console.error(`✗ --target must be one of: ${TARGETS.join(', ')} (got "${flags.target}")`);
  process.exit(1);
}

const spec = COMMANDS[command];
const isProd = flags.target === 'production';

// ─────────────────────────────────────────────────────────────────────
// Guards
// ─────────────────────────────────────────────────────────────────────

banner();

if (isProd && spec.safety === 'local-only') {
  console.error(`✗ \`db ${command}\` cannot run against production.`);
  if (command === 'reset') {
    console.error(
      '\n  A production rebuild drops every table. It goes through\n' +
        '  docs/runbooks/prod-database-reset.md, which covers the backup,\n' +
        '  the password rotation and the post-reset verification that this\n' +
        '  wrapper cannot enforce for you.',
    );
  }
  process.exit(1);
}

if (isProd && spec.safety === 'writes') {
  await confirmProduction(command);
}

// ─────────────────────────────────────────────────────────────────────
// Dispatch
// ─────────────────────────────────────────────────────────────────────

try {
  await run(command);
} catch (err) {
  console.error(`\n✗ \`db ${command}\` failed against ${flags.target}.`);
  if (err?.message) console.error(`  ${err.message}`);
  process.exit(1);
}

async function run(cmd) {
  switch (cmd) {
    case 'start':
      return supabase(['start']);
    case 'stop':
      return supabase(['stop']);
    case 'status':
      return supabase(['status']);
    case 'test':
      return supabase(['test', 'db']);
    case 'reset':
      return supabase(['db', 'reset']);

    case 'lint':
      return supabase(['db', 'lint', ...targetFlag()]);
    case 'diff':
      return supabase(['db', 'diff', ...targetFlag()]);

    case 'push':
      ensureLinked();
      return supabase(['db', 'push', '--linked']);

    case 'types': {
      // Every exposed schema, so non-public tables are typed and the
      // `as never` casts that hide runtime bugs are unnecessary.
      const schemaArgs = TYPED_SCHEMAS.flatMap((s) => ['--schema', s]);
      const source = isProd ? ['--linked'] : ['--local'];
      if (isProd) ensureLinked();
      const out = capture(['gen', 'types', 'typescript', ...source, ...schemaArgs]);
      if (!out.trim()) {
        throw new Error(
          isProd
            ? 'Supabase returned nothing. Is the project linked and reachable?'
            : 'Supabase returned nothing. Is the local stack running? Try `pnpm db start`.',
        );
      }
      const dest = 'packages/supabase/src/types.gen.ts';
      execSync(`cat > ${dest}`, { input: out, stdio: ['pipe', 'inherit', 'inherit'] });
      console.log(`✓ wrote ${dest} (${out.split('\n').length} lines)`);
      return;
    }

    case 'seed':
      return psql('supabase/seed.sql');
    case 'seed-demo':
      return psql('supabase/seed-demo.sql');

    default:
      throw new Error(`no handler for "${cmd}"`);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function targetFlag() {
  if (!isProd) return ['--local'];
  ensureLinked();
  return ['--linked'];
}

function supabase(args) {
  execFileSync('pnpm', ['exec', 'supabase', ...args], { stdio: 'inherit' });
}

function capture(args) {
  return execFileSync('pnpm', ['exec', 'supabase', ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** Apply a SQL file to the target with psql. */
function psql(file) {
  if (!existsSync(file)) throw new Error(`${file} not found`);
  const url = databaseUrl();
  console.log(`Applying ${file} …`);
  execFileSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-f', file], { stdio: 'inherit' });
  console.log(`✓ applied ${file} to ${flags.target}`);
}

function databaseUrl() {
  if (!isProd) {
    return process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  }
  const url = envFromFile('.env.production').SUPABASE_DB_URL ?? process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error(
      'SUPABASE_DB_URL not found. Put it in .env.production (see .env.example) or export it.',
    );
  }
  return url;
}

/** Confirm the CLI is linked to the project we think we are targeting. */
function ensureLinked() {
  const refFile = 'supabase/.temp/project-ref';
  const linked = existsSync(refFile) ? readFileSync(refFile, 'utf8').trim() : null;
  const expected = expectedRef();

  if (!linked) {
    throw new Error('no project linked. Run `pnpm db:link --env production` first.');
  }
  if (expected && linked !== expected) {
    throw new Error(
      `linked project (${linked}) is not the ${flags.target} project (${expected}).\n` +
        `  Run \`pnpm db:link --env ${flags.target}\` first.`,
    );
  }
  console.log(`Linked project:  ${linked}`);
}

function expectedRef() {
  return (
    process.env.SUPABASE_PROJECT_REF_PROD ??
    envFromFile('.env.production').SUPABASE_PROJECT_REF_PROD ??
    null
  );
}

/** Minimal .env parser — enough for KEY=value, ignoring comments and quotes. */
function envFromFile(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

async function confirmProduction(cmd) {
  const ref = expectedRef() ?? '(unknown ref)';
  console.log('');
  console.log('  ⚠  This will MODIFY PRODUCTION.');
  console.log(`     command: db ${cmd}`);
  console.log(`     project: ${ref}`);
  console.log('');

  if (!flags.confirm) {
    console.error('✗ refused. Re-run with --confirm if you mean it.');
    process.exit(1);
  }

  // Typing the ref is deliberately more effort than typing "yes" — it
  // forces you to look at which project you are about to change.
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`     Type the project ref to proceed: `);
  rl.close();

  if (answer.trim() !== ref) {
    console.error('✗ did not match. Nothing was changed.');
    process.exit(1);
  }
  console.log('');
}

function banner() {
  const label = isProd ? 'PRODUCTION' : 'local';
  const rule = '─'.repeat(52);
  console.log(rule);
  console.log(`  target:  ${label}`);
  console.log(`  command: db ${command}`);
  console.log(rule);
}

function readFlag(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

function usage() {
  const rows = Object.entries(COMMANDS)
    .map(([name, s]) => {
      const tag =
        s.safety === 'local-only' ? '[local only]' : s.safety === 'writes' ? '[writes]' : '';
      return `  ${name.padEnd(11)} ${s.help} ${tag}`;
    })
    .join('\n');

  console.log(`
db — database commands, against a target you name explicitly.

  pnpm db <command> [--target local|production] [--confirm]

Commands:
${rows}

Target resolution:
  --target flag  →  SHESA_DB_TARGET env var  →  local

Local is the default on purpose: the safe target is the one you get when
you have not thought about it.

Examples:
  pnpm db start                          spin up the local stack
  pnpm db reset                          rebuild local from migrations + seeds
  pnpm db test                           run the pgTAP suite
  pnpm db diff --target production       what has drifted in production?
  pnpm db types --target production      regenerate types from production
  pnpm db push --target production --confirm

Production credentials are read from .env.production, never .env.local.
`);
}
