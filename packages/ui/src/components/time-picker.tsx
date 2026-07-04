'use client';

import * as React from 'react';
import { Clock as ClockIcon } from 'lucide-react';

import { cn } from '../lib/cn';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

/**
 * TimePicker — small shadcn-styled companion to <DatePicker>.
 *
 * Value shape mirrors an `<input type="time">`: an "HH:mm" string (24-hour).
 * onChange emits the same. Empty string = cleared.
 *
 * The picker itself is two Selects (hours 00–23, minutes at a step) in a
 * Popover; the trigger matches the DatePicker visually so the two sit
 * naturally side-by-side.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseHm(value?: string): { hours: string; minutes: string } {
  if (!value) return { hours: '', minutes: '' };
  const [h, m] = value.split(':');
  if (!h || !m) return { hours: '', minutes: '' };
  return { hours: h.padStart(2, '0'), minutes: m.padStart(2, '0') };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function displayHm(hours: string, minutes: string): string {
  if (!hours || !minutes) return '';
  return `${hours}:${minutes}`;
}

// ---------------------------------------------------------------------------
// TimePicker
// ---------------------------------------------------------------------------

export interface TimePickerProps {
  /** "HH:mm" string, e.g. "14:30". Empty string = cleared. */
  value?: string;
  onChange?: (value: string) => void;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  wrapperClassName?: string;
  id?: string;
  /**
   * Minute step. 5 by default — 12 minute options per hour is the
   * scheduling sweet spot; drop to 1 or 15 as needed.
   */
  minuteStep?: number;
}

export function TimePicker({
  value,
  onChange,
  label,
  helperText,
  placeholder = 'Pick a time',
  required,
  disabled,
  className,
  wrapperClassName,
  id,
  minuteStep = 5,
}: TimePickerProps) {
  const generatedId = React.useId();
  const pickerId = id ?? generatedId;
  const [open, setOpen] = React.useState(false);

  const { hours, minutes } = parseHm(value);
  const displayed = displayHm(hours, minutes);

  const hourOptions = React.useMemo(() => Array.from({ length: 24 }, (_, i) => pad2(i)), []);
  const minuteOptions = React.useMemo(() => {
    const step = Math.max(1, Math.min(30, minuteStep));
    const values: string[] = [];
    for (let m = 0; m < 60; m += step) values.push(pad2(m));
    // Ensure the currently-selected value is present even if it doesn't
    // fall on a step boundary (e.g. an existing "07:37" with step=5).
    if (minutes && !values.includes(minutes)) {
      values.push(minutes);
      values.sort();
    }
    return values;
  }, [minuteStep, minutes]);

  const commit = (nextH: string, nextM: string) => {
    if (!nextH || !nextM) {
      onChange?.('');
      return;
    }
    onChange?.(`${nextH}:${nextM}`);
  };

  const trigger = (
    <button
      id={pickerId}
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex h-[44px] w-full items-center gap-2 rounded-md px-[11px] py-2',
        'border border-(--input-border) bg-transparent text-sm text-left',
        'transition-[border-color,box-shadow]',
        'hover:border-(--input-border-hover)!',
        'focus:outline-none focus:border-(--input-border-hover)! focus:shadow-(--input-focus-shadow)',
        'disabled:cursor-not-allowed disabled:opacity-50',
        !displayed && 'text-muted-foreground',
        className,
      )}
    >
      <ClockIcon size={15} className="shrink-0 text-muted-foreground" />
      {displayed || placeholder}
    </button>
  );

  const picker = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex items-center gap-2">
          <Select value={hours} onValueChange={(h) => commit(h, minutes || '00')}>
            <SelectTrigger className="h-9 w-20 text-sm" aria-label="Hours">
              <SelectValue placeholder="HH" />
            </SelectTrigger>
            <SelectContent>
              {hourOptions.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-sm font-medium text-muted-foreground">:</span>

          <Select value={minutes} onValueChange={(m) => commit(hours || '00', m)}>
            <SelectTrigger className="h-9 w-20 text-sm" aria-label="Minutes">
              <SelectValue placeholder="mm" />
            </SelectTrigger>
            <SelectContent>
              {minuteOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );

  if (label == null && helperText == null) return picker;

  return (
    <div className={cn('flex w-full flex-col', wrapperClassName)}>
      {label != null && (
        <label
          htmlFor={pickerId}
          className="mb-2 inline-flex items-center gap-0.5 text-sm font-medium text-foreground"
        >
          {label}
          {required && <span className="text-danger">*</span>}
        </label>
      )}
      {picker}
      {helperText != null && (
        <span className="mt-1.5 text-xs text-muted-foreground">{helperText}</span>
      )}
    </div>
  );
}
