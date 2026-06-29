/**
 * Shesa ESLint preset for Next.js apps.
 *
 * Adds React + Next-specific rules on top of the base preset.
 * Used by apps/web, apps/auth, apps/exco, apps/finance, apps/connect.
 *
 *   import shesaNext from '@shesa/eslint-config/next';
 *   export default shesaNext;
 *
 * Note: Next's official `eslint-plugin-next` flat-config support is still
 * stabilizing. We keep this preset minimal in E1 and add the Next plugin
 * rules in E10 (app shells), once Next is actually installed in an app.
 */

import base from './index.js';

export default [...base];
