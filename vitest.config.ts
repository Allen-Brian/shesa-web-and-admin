import { defineConfig } from 'vitest/config';

/**
 * Root Vitest config — one runner across the whole workspace.
 *
 * `packages/**` + `apps/**` are scanned for `*.test.ts(x)`; each test
 * file resolves imports via TS module resolution the same way source
 * files do (vitest reads tsconfig via its own loader).
 *
 * Coverage is off by default — turning it on drags a large v8 binary
 * into the pipeline. Enable via `pnpm test --coverage` when we actually
 * want the numbers, e.g. before promoting to a Phase gate.
 *
 * `environment: 'node'` is the default; individual React component tests
 * that need a DOM will opt in via a per-file `// @vitest-environment jsdom`
 * pragma once RTL + jsdom land in a follow-up commit.
 */
export default defineConfig({
  test: {
    include: ['packages/**/*.test.{ts,tsx}', 'apps/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/build/**'],
    globals: false,
    passWithNoTests: true,
  },
});
