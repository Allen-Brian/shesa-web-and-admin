import type { Config } from 'tailwindcss';
import shesa from '@shesa/ui/tailwind.config';

const config: Config = {
  presets: [shesa as never],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
};

export default config;
