'use client';

import * as React from 'react';
import { Input, type InputProps } from './input';

export interface NativeDateInputProps extends Omit<InputProps, 'type' | 'value' | 'onChange'> {
  /** ISO `YYYY-MM-DD` (same API as DatePicker). */
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * `<input type="date">` styled like the Academia Input. Use this inside
 * Dialogs where the Radix Popover-based DatePicker swallows clicks behind
 * the modal layer — the native picker pops out of the OS calendar and works
 * regardless of the surrounding dialog/portal nesting.
 */
export const NativeDateInput = React.forwardRef<HTMLInputElement, NativeDateInputProps>(
  ({ value, onChange, ...rest }, ref) => (
    <Input
      ref={ref}
      type="date"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      {...rest}
    />
  ),
);
NativeDateInput.displayName = 'NativeDateInput';
