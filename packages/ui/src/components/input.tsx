import * as React from 'react';
import { cn } from '../lib/cn';
import { Info } from './info';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional label rendered above the input. When provided, Input renders
   * its own wrapper so the consumer doesn't need a separate <Label />. */
  label?: React.ReactNode;
  /** Helper text rendered below the input (6px gap). Use for hints / format. */
  helperText?: React.ReactNode;
  /** Tooltip content shown next to the label via the <Info /> icon. */
  textInfo?: React.ReactNode;
  /** Class for the outer wrapper when label/helper present. */
  wrapperClassName?: string;
  /** Class for the label element. */
  labelClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      helperText,
      textInfo,
      wrapperClassName,
      labelClassName,
      id,
      required,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    const inputEl = (
      <input
        ref={ref}
        id={inputId}
        type={type}
        required={required}
        className={cn(
          'block h-[44px] w-full rounded-md bg-(--input-bg) text-sm text-foreground',
          'px-[11px] py-2',
          'border border-(--input-border)',
          'placeholder:text-muted-foreground',
          'transition-[border-color,box-shadow]',
          'hover:border-(--input-border-hover)!',
          'focus:outline-none focus:border-(--input-border-hover)! focus:shadow-(--input-focus-shadow)',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className,
        )}
        {...props}
      />
    );

    // Bare input — backwards compatible. Used by call-sites that already wrap
    // Input themselves (e.g. login page with its show-password button).
    if (label == null && helperText == null && textInfo == null) {
      return inputEl;
    }

    return (
      <div className={cn('flex w-full flex-col', wrapperClassName)}>
        {label != null && (
          <label
            htmlFor={inputId}
            className={cn(
              'mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-foreground',
              labelClassName,
            )}
          >
            <span className="inline-flex items-center gap-0.5">
              {label}
              {required && <span className="text-danger">*</span>}
            </span>
            {textInfo != null && <Info>{textInfo}</Info>}
          </label>
        )}
        {inputEl}
        {helperText != null && (
          <span className="mt-1.5 text-xs text-muted-foreground">{helperText}</span>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
