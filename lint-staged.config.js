/**
 * lint-staged — runs on every commit via the husky pre-commit hook.
 *
 * E0 only includes Prettier; ESLint joins this config in E1 once
 * packages/eslint-config exists. The hook is intentionally minimal
 * until then so commits aren't blocked by tooling that isn't wired.
 */

/** @type {import('lint-staged').Configuration} */
export default {
  '*.{ts,tsx,js,jsx,mjs,cjs}': ['prettier --write'],
  '*.{json,md,yaml,yml,scss,css}': ['prettier --write'],
};
