/**
 * Shared Tailwind preset for Shesa apps.
 *
 * Apps consume this via:
 *
 *   import shesa from '@shesa/ui/tailwind.config';
 *   export default { presets: [shesa], content: ['./src/**\/*.{ts,tsx}', ...] };
 *
 * The preset only declares THEME tokens (colors via CSS vars, radii,
 * spacing) — `content` paths are app-specific so each app scans its
 * own source plus `packages/ui/src/**` for class names.
 *
 * Colors are CSS variables, defined in `src/theme/tokens.css`. That file
 * is imported by each app's root layout so the variables resolve at
 * runtime; Tailwind's `colors` config references them by name.
 */

import type { Config } from 'tailwindcss';

const preset = {
  content: [], // overridden by each app
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
} satisfies Partial<Config>;

export default preset;
