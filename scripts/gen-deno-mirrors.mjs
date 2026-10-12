#!/usr/bin/env node
/**
 * gen-deno-mirrors — emit the Deno copies of shared domain modules.
 *
 *     pnpm gen:deno-mirrors          # write
 *     pnpm check:deno-mirrors        # verify, exit 1 on drift  (CI)
 *
 * Supabase Edge Functions run under Deno and cannot import across the
 * monorepo boundary into `packages/*`, so the import validator has to
 * exist twice. It did — as two hand-written files whose headers each said
 * "keep in sync". They had drifted: the Deno copy grew an option the
 * domain copy never got, and because nothing in `apps/` imported the
 * domain copy, the tested implementation was not the one that ran.
 *
 * "Keep in sync" is not a mechanism. This is: one source, one generated
 * output, and a CI check that fails when the output goes stale.
 *
 * The transform is deliberately small — inline the one cross-package
 * import, add a banner — so that reading the generated file next to the
 * source shows an obvious correspondence.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

/** @type {ReadonlyArray<{source: string, out: string, inline: ReadonlyArray<{statement: string, from: string}>}>} */
const MIRRORS = [
  {
    source: 'packages/domain/src/imports/validation.ts',
    out: 'supabase/functions/_shared/import-validation.generated.ts',
    inline: [
      {
        statement: "import { defaultExitYear } from '../members/exit-year';",
        from: 'packages/domain/src/members/exit-year.ts',
      },
    ],
  },
];

/** Strip a module down to its declarations, dropping its own imports. */
function declarationsOf(path) {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => !/^import\s/.test(line))
    .join('\n')
    .trim();
}

function render(mirror) {
  let body = readFileSync(mirror.source, 'utf8');

  for (const { statement, from } of mirror.inline) {
    if (!body.includes(statement)) {
      throw new Error(`${mirror.source}: expected to find\n  ${statement}\nbut it is not there.`);
    }
    body = body.replace(
      statement,
      [
        `/* ── inlined from ${from} ─────────────────────────────── */`,
        declarationsOf(from),
        '/* ── end inline ──────────────────────────────────────────── */',
      ].join('\n'),
    );
  }

  const banner = [
    '// GENERATED FILE — DO NOT EDIT.',
    `// Source: ${mirror.source}`,
    '// Regenerate: pnpm gen:deno-mirrors   ·   Verify: pnpm check:deno-mirrors',
    '//',
    '// Edge Functions run under Deno and cannot import from packages/*, so the',
    '// validator is emitted here instead of being kept in sync by hand.',
    '',
    '',
  ].join('\n');

  return banner + body;
}

const check = process.argv.includes('--check');
let drifted = 0;

for (const mirror of MIRRORS) {
  const expected = render(mirror);
  if (!check) {
    writeFileSync(mirror.out, expected);
    console.log(`wrote ${mirror.out}`);
    continue;
  }

  let actual = '';
  try {
    actual = readFileSync(mirror.out, 'utf8');
  } catch {
    /* missing counts as drift */
  }

  if (actual !== expected) {
    drifted += 1;
    console.error(`✗ ${relative(process.cwd(), mirror.out)} is stale.`);
    console.error(`  It no longer matches ${mirror.source}. Run: pnpm gen:deno-mirrors`);
  }
}

if (check) {
  if (drifted > 0) process.exit(1);
  console.log(`✓ deno mirrors: ${MIRRORS.length} generated file(s) match their source`);
}
