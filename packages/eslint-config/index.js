/**
 * Shesa ESLint base preset (flat config, ESLint 9).
 *
 * Apps and packages consume this via their own `eslint.config.js`:
 *
 *   import shesa from '@shesa/eslint-config';
 *   export default shesa;
 *
 * Or extend it:
 *
 *   import shesa from '@shesa/eslint-config';
 *   export default [...shesa, { rules: { ... } }];
 */

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/build/**',
      '**/out/**',
      '**/coverage/**',
      '**/*.gen.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier, // must be last so it disables conflicting style rules
];
