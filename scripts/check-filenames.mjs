#!/usr/bin/env node
/**
 * check-filenames — enforce docs/standards/frontend.md §5.
 *
 *     pnpm check:filenames [--list]
 *
 * The rule: **a filename must say what the file is without its directory.**
 *
 * A standard that is only prose drifts. This repository already learned that
 * the expensive way — six files carried comments asserting an ESLint import
 * firewall that had never been written — so §5 gets a check that runs in CI.
 *
 * `--list` prints the offenders grouped by directory, which is the worklist
 * for renaming them.
 */

import { readdirSync, statSync } from 'node:fs';
import { join, basename, dirname, relative } from 'node:path';

const ROOTS = ['apps', 'packages'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.turbo', 'dist', 'build', 'coverage']);

/**
 * Filenames the Next.js App Router resolves by name. The directory IS the
 * identifier for these, so §5.1 does not apply.
 */
const FRAMEWORK_OWNED = new Set([
  'page',
  'layout',
  'route',
  'middleware',
  'loading',
  'error',
  'global-error',
  'not-found',
  'template',
  'default',
  'sitemap',
  'robots',
  'manifest',
  'opengraph-image',
  'twitter-image',
  'icon',
  'apple-icon',
  'instrumentation',
  'next-env.d',
  'index',
]);

/** Bare, context-free names, and what to use instead. */
const BANNED = new Map([
  ['actions', '<entity>-actions.ts'],
  ['types', '<entity>-<concern>-types.ts'],
  ['data', '<entity>-content.ts (static) or load-<entity>.ts (fetched)'],
  ['helpers', '<entity>-helpers.ts'],
  ['utils', '<entity>-utils.ts'],
  ['constants', '<entity>-constants.ts'],
  ['loader', 'load-<entity>.ts'],
  ['form', '<entity>-form.tsx'],
  ['list-view', '<entity-plural>-list-view.tsx'],
  ['detail-view', '<entity>-detail-view.tsx'],
  ['slugify', 'import from @shesa/domain/utils'],
  ['header', '<entity>-header.tsx'],
  ['roster', '<entity>-roster.tsx'],
  ['loader-types', '<entity>-loader-types.ts'],
]);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

/**
 * The design-system primitives are named after the component they export,
 * one file per shadcn primitive — `button.tsx`, `dialog.tsx`, `form.tsx`.
 * The bare noun IS the identifier there, and it matches upstream, so §5.1
 * does not apply to that one directory.
 */
const EXEMPT_DIRS = ['packages/ui/src/components'];

const offenders = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    if (EXEMPT_DIRS.some((d) => file.startsWith(`${d}/`))) continue;
    const stem = basename(file).replace(/\.(ts|tsx)$/, '');
    if (FRAMEWORK_OWNED.has(stem)) continue;
    const fix = BANNED.get(stem);
    if (fix) offenders.push({ file, stem, fix });
  }
}

if (offenders.length === 0) {
  console.log('✓ filenames: every file is self-describing (frontend.md §5)');
  process.exit(0);
}

const byName = new Map();
for (const o of offenders) {
  if (!byName.has(o.stem)) byName.set(o.stem, []);
  byName.get(o.stem).push(o);
}

console.error(`✗ ${offenders.length} file(s) violate frontend.md §5 — a filename`);
console.error('  must say what the file is without its directory.\n');

for (const [stem, list] of [...byName].sort((a, b) => b[1].length - a[1].length)) {
  console.error(`  ${stem}.*  (${list.length})  →  ${list[0].fix}`);
  if (process.argv.includes('--list')) {
    for (const o of list) console.error(`      ${o.file}`);
  }
}

if (!process.argv.includes('--list')) {
  console.error('\n  Re-run with --list to see every path.');
}
process.exit(1);
