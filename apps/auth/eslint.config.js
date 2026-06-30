import shesa from '@shesa/eslint-config/next';

export default [
  ...shesa,
  {
    // App-specific ignores (Next build output, generated types).
    ignores: ['.next/**', 'next-env.d.ts'],
  },
];
