/**
 * @shesa/ui — shared UI primitives + theme tokens.
 *
 * Phase 0 components: Button, Input, Label, Card. Everything else lands
 * as apps need it (either vendored shadcn source or a fresh
 * `pnpm --filter @shesa/ui dlx shadcn add <name>` when npm/registry
 * connectivity cooperates).
 */

export { cn } from './lib/cn';

export { Button, buttonVariants, type ButtonProps } from './components/button';
export { Input, type InputProps } from './components/input';
export { Label } from './components/label';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './components/card';

export { colors } from './theme/colors';
export { typography } from './theme/typography';
