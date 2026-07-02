'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

export type TagColorTheme = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type TagSize = 1 | 2 | 3 | 4;

/**
 * Static class lookups for size + colorTheme. We keep these as plain objects
 * (instead of cva variants) so:
 *   1. Tailwind's source scanner picks every class up via plain string literals
 *      — no string interpolation gymnastics.
 *   2. Numeric keys (1..9) work without cva's variant-key-string-coercion
 *      quirks, which silently dropped some themes in the previous version.
 */
const SIZE_CLASSES: Record<TagSize, string> = {
  1: 'h-[26px] px-2.5 text-xs',
  2: 'h-[28px] pl-3 pr-2 text-sm',
  3: 'h-6 rounded-md border-transparent px-2 text-sm',
  4: 'h-[30px] px-2 text-[13px]',
};

const COLOR_CLASSES: Record<TagColorTheme, string> = {
  0: 'border-border bg-muted text-foreground',
  1: 'border-blue-400/70 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300',
  2: 'border-warning/70 bg-warning/15 text-warning border-warning/40 bg-warning/10 text-warning',
  3: 'border-sky-400/70 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300',
  4: 'border-pink-400/70 bg-pink-50 text-pink-700 dark:border-pink-500/40 dark:bg-pink-500/10 dark:text-pink-300',
  5: 'border-fuchsia-400/70 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/40 dark:bg-fuchsia-500/10 dark:text-fuchsia-300',
  6: 'border-violet-400/70 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300',
  7: 'border-yellow-400/70 bg-yellow-50 text-yellow-700 dark:border-yellow-500/40 dark:bg-yellow-500/10 dark:text-yellow-300',
  8: 'border-success/70 bg-success/15 text-success border-success/40 bg-success/10 text-success',
  9: 'border-border bg-accent text-foreground dark:bg-card',
};

const BASE =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-medium transition-colors';

export interface TagProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
  text: string;
  /** Bare hex/rgb/css color — overrides colorTheme to produce a tinted custom-color tag. */
  color?: string;
  colorTheme?: TagColorTheme;
  size?: TagSize;
  clickable?: boolean;
  invalid?: boolean;
  /** When true, render an X icon that emits onDelete. */
  added?: boolean;
  onDelete?: () => void;
}

/**
 * Status / category chip. Ported from the Vue Tag atom; sizes 1–4 + 10 color
 * themes (0–9) + a custom `color` prop that produces a translucent tint.
 */
export const Tag = React.forwardRef<HTMLDivElement, TagProps>(
  (
    {
      text,
      color,
      colorTheme = 0,
      size = 1,
      clickable,
      invalid,
      added,
      onDelete,
      className,
      style,
      ...rest
    },
    ref,
  ) => {
    const customStyle = color
      ? {
          backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
          borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
          color,
          ...style,
        }
      : style;

    return (
      <div
        ref={ref}
        className={cn(
          BASE,
          SIZE_CLASSES[size],
          color ? undefined : COLOR_CLASSES[colorTheme],
          clickable && 'cursor-pointer hover:opacity-80',
          invalid && 'border-destructive',
          className,
        )}
        style={customStyle}
        {...rest}
      >
        <span className="leading-none">{text}</span>
        {added && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100"
            aria-label={`Remove ${text}`}
          >
            <X size={12} />
          </button>
        )}
      </div>
    );
  },
);
Tag.displayName = 'Tag';
