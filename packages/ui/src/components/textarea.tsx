/**
 * Textarea — plain HTML textarea with shadcn styling.
 * Adapted from https://ui.shadcn.com/docs/components/textarea (MIT).
 */

import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '../lib/cn';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-input bg-(--input-bg) px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground hover:border-(--input-border-hover) focus:outline-none focus:border-(--input-border-hover)! focus:shadow-(--input-focus-shadow) disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
