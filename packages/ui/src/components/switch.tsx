'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** 1 = 33×20 px · 2 = 40×24 px (default) · 3 = 28×17 px */
  size?: 1 | 2 | 3;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

const SIZES = {
  1: {
    track: 'w-[33px] h-[20px]',
    padding: '2px',
    circle: 'w-[16px] h-[16px]',
    on: 'translate-x-[13px]',
  },
  2: {
    track: 'w-[40px] h-[24px]',
    padding: '2px',
    circle: 'w-[20px] h-[20px]',
    on: 'translate-x-[16px]',
  },
  3: {
    track: 'w-[28px] h-[17px]',
    padding: '1px',
    circle: 'w-[15px] h-[15px]',
    on: 'translate-x-[11px]',
  },
} as const;

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  size = 2,
  className,
  id,
  'aria-label': ariaLabel,
}: SwitchProps) {
  const uid = React.useId();
  const inputId = id ?? uid;
  const s = SIZES[size];

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => !disabled && onCheckedChange(e.target.checked)}
        disabled={disabled}
        aria-checked={checked}
        aria-label={ariaLabel}
        className="sr-only"
      />
      {/* pill track */}
      <span
        className={cn(
          'relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out',
          s.track,
          checked ? 'bg-primary' : 'bg-input',
        )}
        style={{ padding: s.padding }}
      >
        {/* sliding circle */}
        <span
          className={cn(
            'rounded-full bg-background shadow-sm transition-transform duration-200 ease-in-out',
            s.circle,
            checked ? s.on : 'translate-x-0',
          )}
        />
      </span>
    </label>
  );
}
