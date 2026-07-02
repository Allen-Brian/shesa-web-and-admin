'use client';

import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../lib/cn';

type CheckboxSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<CheckboxSize, { box: number; icon: number; radius: string; text: string }> =
  {
    // Mirrors the Vue Check styles: style-4 = sm (16px), style-2 = md (18px),
    // style-3 = lg (19px) approx, with the same 2px border + rounded corners.
    sm: { box: 18, icon: 10, radius: 'rounded-[4px]', text: 'text-xs' },
    md: { box: 20, icon: 12, radius: 'rounded-[5px]', text: 'text-sm' },
    lg: { box: 24, icon: 14, radius: 'rounded-[6px]', text: 'text-base' },
  };

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type' | 'checked'
> {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: CheckboxSize;
  /** Inline label rendered next to the box. */
  label?: React.ReactNode;
  /** Wrap-level className. The visible box class can be customised via boxClassName. */
  boxClassName?: string;
}

/**
 * Academia checkbox primitive. Ported from the Vue `<Check />` component:
 * 2px border + rounded square, transparent until checked/indeterminate, then
 * filled with the brand primary. Three sizes (sm/md/lg) approximate the Vue
 * style-4 / style-2 / style-3 variants. The underlying `<input>` is hidden
 * (sr-only); the visible square is a sibling `<span>` driven by the input's
 * checked state, so accessibility / keyboard nav stay native.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked,
      indeterminate,
      onCheckedChange,
      onChange,
      size = 'md',
      label,
      className,
      boxClassName,
      disabled,
      ...props
    },
    ref,
  ) => {
    const internalRef = React.useRef<HTMLInputElement | null>(null);
    React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    // `indeterminate` is a DOM property, not a React attribute — wire it on mount.
    React.useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = !!indeterminate;
      }
    }, [indeterminate]);

    const s = SIZE_MAP[size];
    const isChecked = !!checked;
    const isActive = isChecked || !!indeterminate;

    return (
      <label
        className={cn(
          'inline-flex select-none items-center gap-2',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className,
        )}
      >
        <input
          ref={internalRef}
          type="checkbox"
          checked={isChecked}
          disabled={disabled}
          onChange={(e) => {
            onCheckedChange?.(e.target.checked);
            onChange?.(e);
          }}
          className="sr-only"
          {...props}
        />
        <span
          aria-hidden
          style={{ width: s.box, height: s.box }}
          className={cn(
            'inline-flex shrink-0 items-center justify-center border-2 transition-colors',
            s.radius,
            isActive ? 'border-primary bg-primary' : 'border-border bg-card',
            boxClassName,
          )}
        >
          {indeterminate ? (
            <Minus size={s.icon} strokeWidth={3} className="text-white" />
          ) : isChecked ? (
            <Check size={s.icon} strokeWidth={3} className="text-white" />
          ) : null}
        </span>
        {label !== undefined && label !== null && (
          <span className={cn(s.text, 'leading-none')}>{label}</span>
        )}
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';
