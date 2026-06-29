/**
 * @shesa/ui — shared UI primitives + theme tokens.
 *
 * E1 ships the foundation: `cn` helper, theme color/typography tokens,
 * Tailwind preset, brand placeholders. Real shadcn/ui components are
 * added in E11 (`pnpm --filter @shesa/ui shadcn add <component>`).
 */

export { cn } from './lib/cn';
export { colors } from './theme/colors';
export { typography } from './theme/typography';
