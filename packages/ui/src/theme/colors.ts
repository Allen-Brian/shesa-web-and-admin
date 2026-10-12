/**
 * TypeScript mirror of the CSS color tokens in `tokens.css`.
 *
 * Use these names when a TS context needs a color reference (e.g. an
 * inline `style={{ color: colors.primary }}` for a one-off, or building
 * a chart-color palette in JS). Most styling should still go through
 * Tailwind classes — this is the escape hatch.
 *
 * When tokens.css changes, this file changes alongside it (manually —
 * there's no generator, the file is short enough to stay in sync by
 * inspection).
 */

export const colors = {
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  card: 'hsl(var(--card))',
  cardForeground: 'hsl(var(--card-foreground))',
  popover: 'hsl(var(--popover))',
  popoverForeground: 'hsl(var(--popover-foreground))',
  primary: 'hsl(var(--primary))',
  primaryForeground: 'hsl(var(--primary-foreground))',
  secondary: 'hsl(var(--secondary))',
  secondaryForeground: 'hsl(var(--secondary-foreground))',
  muted: 'hsl(var(--muted))',
  mutedForeground: 'hsl(var(--muted-foreground))',
  accent: 'hsl(var(--accent))',
  accentForeground: 'hsl(var(--accent-foreground))',
  destructive: 'hsl(var(--destructive))',
  destructiveForeground: 'hsl(var(--destructive-foreground))',
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',
} as const;

export type ColorToken = keyof typeof colors;
