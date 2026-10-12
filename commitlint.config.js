/**
 * commitlint config — enforces Conventional Commits with Shesa's scope enum.
 * The scope list mirrors docs/standards/git-conventions.md §3 and MUST stay in sync;
 * a new scope here without the doc update (or vice versa) is a review failure.
 */

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        // apps
        'web',
        'auth',
        'exco',
        'finance',
        'connect',

        // domains (schema-aligned)
        'core',
        'finance-domain',
        'cms',
        'connect-domain',
        'audit',
        'notifications',

        // shared packages
        'ui',
        'types',
        'domain',
        'supabase',
        'config',
        'eslint-config',
        'tsconfig',

        // infra / meta
        'infra',
        'ci',
        'docs',
        'deps',

        // repo-wide catch-all
        'repo',
      ],
    ],
    'scope-empty': [2, 'never'],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 72],
  },
};
