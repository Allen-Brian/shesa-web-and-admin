'use client';

import * as React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { cn } from '../lib/cn';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function toDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = parseISO(value);
  return isValid(d) ? d : undefined;
}

function fromDate(d?: Date): string {
  return d && isValid(d) ? format(d, 'yyyy-MM-dd') : '';
}

function displayDate(d?: Date): string {
  return d && isValid(d) ? format(d, 'PP') : '';
}

/**
 * Find the closest Radix Dialog content that contains `el`. Returned element
 * is used as the Popover Portal's `container`, keeping the calendar inside
 * the dialog's DOM scope so pointer events aren't blocked by the dialog's
 * modal overlay. Returns `null` for triggers that aren't inside a dialog —
 * in that case Radix portals to `document.body` as before.
 */
function useDialogContainer(triggerRef: React.RefObject<HTMLElement | null>, open: boolean) {
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    if (!open) return;
    const ancestor = triggerRef.current?.closest<HTMLElement>('[role="dialog"]');
    setContainer(ancestor ?? null);
  }, [open, triggerRef]);
  return container;
}

// ---------------------------------------------------------------------------
// DatePicker — single-date calendar in a popover. Matches the Input API:
//   value      YYYY-MM-DD string  (controlled)
//   onChange   called with YYYY-MM-DD on pick; '' when cleared
//   label      renders a label above (mirrors Input's label prop)
// ---------------------------------------------------------------------------

export interface DatePickerProps {
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
}

export function DatePicker({
  value,
  onChange,
  label,
  helperText,
  placeholder = 'Pick a date',
  required,
  disabled,
  className,
  wrapperClassName,
  id,
}: DatePickerProps) {
  const generatedId = React.useId();
  const pickerId = id ?? generatedId;
  const [open, setOpen] = React.useState(false);
  const selected = toDate(value);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const container = useDialogContainer(triggerRef, open);

  const trigger = (
    <button
      ref={triggerRef}
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
        !selected && 'text-muted-foreground',
        className,
      )}
    >
      <CalendarIcon size={15} className="shrink-0 text-muted-foreground" />
      {selected ? displayDate(selected) : placeholder}
    </button>
  );

  const picker = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" container={container}>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange?.(fromDate(date));
            setOpen(false);
          }}
          autoFocus
        />
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

// ---------------------------------------------------------------------------
// DateRangePicker — two-date range calendar in a single popover.
//   from / onFromChange   → start date (YYYY-MM-DD string)
//   to   / onToChange     → end date   (YYYY-MM-DD string)
// ---------------------------------------------------------------------------

export interface DateRangePickerProps {
  from?: string;
  to?: string;
  onFromChange?: (value: string) => void;
  onToChange?: (value: string) => void;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  wrapperClassName?: string;
  id?: string;
}

export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
  label,
  helperText,
  placeholder = 'Pick a date range',
  required,
  disabled,
  className,
  wrapperClassName,
  id,
}: DateRangePickerProps) {
  const generatedId = React.useId();
  const pickerId = id ?? generatedId;
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const container = useDialogContainer(triggerRef, open);

  const fromDate = toDate(from);
  const toDate2 = toDate(to);

  const range: DateRange | undefined = fromDate ? { from: fromDate, to: toDate2 } : undefined;

  const displayLabel = fromDate
    ? toDate2
      ? `${displayDate(fromDate)} → ${displayDate(toDate2)}`
      : `${displayDate(fromDate)} → …`
    : placeholder;

  const handleSelect = (r: DateRange | undefined) => {
    onFromChange?.(fromDate ? format(r?.from ?? new Date(0), 'yyyy-MM-dd') : '');
    onToChange?.(r?.to ? format(r.to, 'yyyy-MM-dd') : '');
    if (r?.from && r?.to) setOpen(false);
  };

  const trigger = (
    <button
      ref={triggerRef}
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
        !fromDate && 'text-muted-foreground',
        className,
      )}
    >
      <CalendarIcon size={15} className="shrink-0 text-muted-foreground" />
      {displayLabel}
    </button>
  );

  const picker = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" container={container}>
        <Calendar
          mode="range"
          selected={range}
          onSelect={(r) => {
            const newFrom = r?.from ? format(r.from, 'yyyy-MM-dd') : '';
            const newTo = r?.to ? format(r.to, 'yyyy-MM-dd') : '';
            onFromChange?.(newFrom);
            onToChange?.(newTo);
            if (r?.from && r?.to) setOpen(false);
          }}
          numberOfMonths={2}
          autoFocus
        />
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
