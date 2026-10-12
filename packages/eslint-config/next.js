/**
 * Shesa ESLint preset for Next.js apps — `apps/web` and `apps/admin`.
 *
 *   import shesaNext from '@shesa/eslint-config/next';
 *   export default shesaNext;
 *
 * On top of the base preset this adds the server/client import firewall
 * (SEC-11). Next's own `eslint-plugin-next` flat-config support is still
 * stabilizing, so its rules are not wired in here yet; `next lint` supplies
 * them at the app level in the meantime.
 */

import base from './index.js';
import shesaPlugin from './no-server-imports-in-client.js';

export default [
  ...base,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: { shesa: shesaPlugin },
    rules: {
      'shesa/no-server-imports-in-client': 'error',
    },
  },
];
