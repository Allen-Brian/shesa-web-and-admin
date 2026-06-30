import shesa from '@shesa/eslint-config/next';

export default [
  ...shesa,
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
];
