/**
 * Typography scale — placeholder values until brand typography lands.
 *
 * Most UI consumes typography via Tailwind classes (`text-sm`,
 * `font-medium`, `leading-relaxed`). This module gives TS callers an
 * escape hatch and a single place to swap to a brand type system later
 * (custom font, custom line-height ramp, etc.).
 */

export const typography = {
  fontFamily: {
    sans: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)',
    mono: 'var(--font-mono, ui-monospace, SFMono-Regular, monospace)',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
} as const;
