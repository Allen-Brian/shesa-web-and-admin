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
  // Automatic React runtime so component tests don't need `import React`
  // at the top of every file. Vitest uses esbuild for TSX transform;
  // esbuild's default jsx setting is 'transform' (classic), which
  // rewrites <Foo /> to `React.createElement(...)` and blows up when
  // React isn't in scope. `automatic` matches Next / Vite behavior.
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    include: ['packages/**/*.test.{ts,tsx}', 'apps/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/build/**'],
    globals: false,
    passWithNoTests: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
