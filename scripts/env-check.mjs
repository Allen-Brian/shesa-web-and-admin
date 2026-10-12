#!/usr/bin/env node
/**
 * env:check — audit which env vars are missing for a given environment.
 *
 * Usage:
 *   pnpm env:check                # checks .env.local
 *   pnpm env:check --env local    # same
 *   pnpm env:check --env staging  # checks GitHub Actions secrets via `gh`
 *   pnpm env:check --env production
 *
 * Exit code is 0 if every required var is set, non-zero otherwise — wire
 * this into CI so a PR that adds an env var without setting it in the
 * target environment fails the pipeline.
 *
 * Note: GitHub never reveals secret VALUES via `gh`, only their PRESENCE.
 * This script tells you "RESEND_API_KEY is set" / "is missing"; it cannot
 * tell you whether the value is correct. That's fine for an audit.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENVS, ENV_VARS } from './env-spec.mjs';

const REPO_ROOT = process.cwd();

function parseArgs(argv) {
  const args = { env: 'local' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--env') args.env = argv[++i];
    else if (a === '-h' || a === '--help') args.help = true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`
env:check — audit env vars for an environment.

  pnpm env:check                   # checks .env.local
  pnpm env:check --env staging     # checks GitHub Actions secrets
  pnpm env:check --env production
`);
  process.exit(0);
}

if (!ENVS.includes(args.env)) {
  console.error(`unknown --env "${args.env}". Pick one of: ${ENVS.join(', ')}`);
  process.exit(1);
}

if (args.env === 'local') {
  checkLocal();
} else {
  checkRemote(args.env);
}

// ─────────────────────────────────────────────────────────────────────
// LOCAL: parse .env.local
// ─────────────────────────────────────────────────────────────────────
function checkLocal() {
  const file = join(REPO_ROOT, '.env.local');
  if (!existsSync(file)) {
    console.error(`✗ ${file} does not exist. Run \`pnpm env:init\` first.`);
    process.exit(2);
  }

  const set = parseEnvFile(readFileSync(file, 'utf8'));
  reportMissing('local', (name) => Boolean(set.get(name)));
}

function parseEnvFile(contents) {
  const map = new Map();
  for (const line of contents.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const name = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    map.set(name, value);
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────
// STAGING/PRODUCTION: ask `gh` what's set
// ─────────────────────────────────────────────────────────────────────
function checkRemote(env) {
  const secrets = listGhSecrets(env);
  const variables = listGhVariables(env);
  if (secrets === null && variables === null) {
    console.error('✗ gh CLI not available or not authenticated. Run `gh auth login` first.');
    process.exit(3);
  }
  reportMissing(env, (name) => {
    return (secrets ?? new Set()).has(name) || (variables ?? new Set()).has(name);
  });
}

function listGhSecrets(env) {
  try {
    const raw = execSync(`gh secret list --env ${env} --json name`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return new Set(JSON.parse(raw).map((row) => row.name));
  } catch {
    return null;
  }
}

function listGhVariables(env) {
  try {
    const raw = execSync(`gh variable list --env ${env} --json name`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return new Set(JSON.parse(raw).map((row) => row.name));
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Shared: report which required vars are missing for the env
// ─────────────────────────────────────────────────────────────────────
function reportMissing(env, isSet) {
  let missing = 0;
  const required = ENV_VARS.filter((v) => requiredFor(v, env));

  for (const v of required) {
    if (isSet(v.name)) {
      console.log(`  ✓ ${v.name}`);
    } else {
      console.log(`  ✗ ${v.name}  — ${v.description}`);
      missing++;
    }
  }

  console.log('');
  if (missing === 0) {
    console.log(`✓ all required vars present for ${env}.`);
    process.exit(0);
  } else {
    console.log(`✗ ${missing} missing var(s) for ${env}. See above.`);
    if (env !== 'local') {
      console.log(`  Run \`pnpm env:init --env ${env}\` to print the setup commands.`);
    } else {
      console.log(`  Run \`pnpm env:init --force\` to regenerate .env.local with defaults.`);
    }
    process.exit(1);
  }
}

function requiredFor(v, env) {
  // Every variable is required in every env. The distinction is just
  // *who* provides it (auto-default, supabase status, user input,
  // GitHub Actions secrets/variables).
  return true;
}
