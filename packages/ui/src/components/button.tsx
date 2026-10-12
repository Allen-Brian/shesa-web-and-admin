import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-[filter,box-shadow,background-color,border-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          '[background-image:var(--gradient-primary)] text-primary-foreground shadow-sm hover:brightness-110 active:brightness-95',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:brightness-110',
        outline: 'border border-border bg-background text-foreground hover:bg-muted',
        secondary: 'bg-secondary text-secondary-foreground hover:brightness-110',
        ghost: 'text-foreground hover:bg-muted',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-[44px] px-5 py-2', // 44px — Academia primary control height
        sm: 'h-[40px] rounded-md px-3 text-sm',
        lg: 'h-[48px] rounded-md px-8',
        icon: 'h-[44px] w-[44px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /**
   * Work is in flight: shows a spinner in place of any leading icon and
   * blocks further presses. Every action button should pass its pending
   * state here — a button that looks idle while its server action runs
   * invites a second click, and a second click on "Save" or "Pay" is a
   * duplicate write.
   */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    // `asChild` hands rendering to the caller's element (a Link, say),
    // which must receive exactly one child — so the spinner is only
    // composed in for a real <button>.
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
        aria-busy={loading || undefined}
        disabled={loading || props.disabled}
      >
        {loading && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
