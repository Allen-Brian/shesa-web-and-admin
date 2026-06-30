import shesa from '@shesa/eslint-config/react';

export default [
  ...shesa,
  {
    ignores: ['dist/**'],
  },
];
