'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/cn';

export interface ColorFieldProps {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly id?: string;
  readonly name?: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly maxLength?: number;
  readonly ariaLabel?: string;
}

/**
 * Combined color field — a swatch + chevron button on the left opens the
 * native OS color picker (via a hidden `<input type="color">`); the right
 * side is a hex text input the user can type into directly. The whole
 * control looks like a single Input, with focus lifted to the wrapper so
 * both segments share one focus ring.
 */
const ColorField = React.forwardRef<HTMLInputElement, ColorFieldProps>(
  (
    {
      value,
      onChange,
      id,
      name,
      placeholder = '#7C3AED',
      disabled,
      className,
      maxLength = 9,
      ariaLabel = 'Open color picker',
    },
    ref,
  ) => {
    const nativeRef = React.useRef<HTMLInputElement>(null);
    return (
      <div
        className={cn(
          'flex h-10 items-center overflow-hidden rounded-md border border-(--input-border) bg-transparent transition-[border-color,box-shadow]',
          'focus-within:border-(--input-border-hover) focus-within:shadow-(--input-focus-shadow)',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <button
          type="button"
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={() => nativeRef.current?.click()}
          className="flex h-full items-center gap-1.5 px-2.5 transition-colors hover:bg-muted focus:outline-none disabled:cursor-not-allowed"
        >
          <span
            className="h-5 w-5 rounded-sm shadow-inner ring-1 ring-inset ring-border/60"
            style={{ backgroundColor: value }}
            aria-hidden
          />
          <ChevronDown className="h-4 w-4 opacity-60" />
        </button>
        <input
          ref={nativeRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
        <div className="h-6 w-px bg-border" aria-hidden />
        <input
          ref={ref}
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
    );
  },
);
ColorField.displayName = 'ColorField';

export { ColorField };
