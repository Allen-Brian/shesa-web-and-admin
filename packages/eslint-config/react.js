/**
 * Shesa ESLint preset for Vite React SPAs.
 *
 * Used by apps/finance and apps/exco. Next apps use `./next` instead,
 * which differs only in adding Next's plugin rules (not in here so we
 * keep this preset Vite-clean).
 *
 *   import shesaReact from '@shesa/eslint-config/react';
 *   export default shesaReact;
 */

import base from './index.js';

export default [...base];
