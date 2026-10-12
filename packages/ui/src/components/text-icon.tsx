'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const textIconVariants = cva(
  'inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium leading-none',
  {
    variants: {
      tone: {
        default: 'text-foreground',
        muted: 'text-muted-foreground',
        primary: 'text-primary',
        success: 'text-success',
        warning: 'text-warning',
        danger: 'text-danger',
        info: 'text-[#3F79F1]',
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
      cta: { true: 'cursor-pointer', false: '' },
      point: {
        true: 'cursor-pointer rounded-md p-2 transition-colors hover:bg-muted',
        false: '',
      },
    },
    defaultVariants: { tone: 'default', size: 'md', cta: false, point: false },
  },
);

const iconBoxVariants = cva('relative inline-flex shrink-0 items-center justify-center', {
  variants: {
    iconSize: {
      sm: 'h-4 w-4 [&>svg]:h-4 [&>svg]:w-4',
      md: 'h-5 w-5 [&>svg]:h-5 [&>svg]:w-5',
      lg: 'h-[30px] w-[30px] [&>svg]:h-[30px] [&>svg]:w-[30px]',
    },
  },
  defaultVariants: { iconSize: 'md' },
});

interface TextIconProps
  extends
    Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof textIconVariants> {
  /** Text label rendered after the icon. */
  text?: React.ReactNode;
  /** Pre-rendered icon node (lucide icon, custom SVG, etc.). */
  icon?: React.ReactNode;
  /** Optional avatar/photo URL — rendered as a 24px circular thumbnail. */
  photo?: string;
  /** Icon box size — defaults to "md" (20px). */
  iconSize?: 'sm' | 'md' | 'lg';
}

/**
 * Status/inline-meta primitive. Renders an icon + text pair with semantic tone
 * colors. Ports the Vue `TextIcon` to React: tone replaces the numbered
 * elStyle, iconSize maps to small/regular/big, `point` and `cta` are kept as
 * boolean variants. The icon node controls its own color (e.g. the supplied
 * filled-circle status icons stay green/orange/red regardless of tone), while
 * tone only colors the text — so semantic meaning stays explicit.
 */
const TextIcon = React.forwardRef<HTMLSpanElement, TextIconProps>(
  ({ text, icon, photo, tone, size, cta, point, iconSize = 'md', className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(textIconVariants({ tone, size, cta, point }), className)}
        {...props}
      >
        {photo ? (
          <span className="relative h-[24px] w-[24px] overflow-hidden rounded-full">
            <img src={photo} alt="" className="h-full w-full object-cover" />
          </span>
        ) : icon ? (
          <span className={iconBoxVariants({ iconSize })}>{icon}</span>
        ) : null}
        {text != null && <span className="truncate">{text}</span>}
      </span>
    );
  },
);
TextIcon.displayName = 'TextIcon';

export { TextIcon, textIconVariants };
export type { TextIconProps };
