'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, type ChevronProps } from 'react-day-picker';
import { cn } from '../lib/cn';
import { buttonVariants } from './button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function CalendarChevron({ orientation, ...props }: ChevronProps) {
  if (orientation === 'left') return <ChevronLeft className="size-4" {...props} />;
  return <ChevronRight className="size-4" {...props} />;
}

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        // `relative` is the positioning context for the absolute nav buttons.
        month: 'relative flex flex-col gap-4',
        // Reserve room at the top for the prev/next buttons sitting at the
        // corners of the month box.
        month_caption: 'flex h-8 items-center justify-center px-9',
        caption_label: 'text-sm font-medium',
        // `nav` is just the wrapper — buttons are absolute themselves so the
        // wrapper's layout is irrelevant; keep it inert.
        nav: 'contents',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'absolute left-1 top-1 z-10 size-7 bg-transparent p-0 opacity-70 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'absolute right-1 top-1 z-10 size-7 bg-transparent p-0 opacity-70 hover:opacity-100',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]',
        week: 'flex w-full mt-2',
        day: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-8 p-0 font-normal aria-selected:opacity-100',
        ),
        range_start:
          '[&>button]:rounded-l-md [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground',
        range_end:
          '[&>button]:rounded-r-md [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground',
        range_middle:
          'bg-accent [&>button]:rounded-none [&>button]:text-accent-foreground [&>button]:hover:bg-transparent',
        selected:
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground',
        today: '[&>button]:bg-accent [&>button]:text-accent-foreground',
        outside: '[&>button]:text-muted-foreground [&>button]:opacity-50',
        disabled: '[&>button]:text-muted-foreground [&>button]:opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{ Chevron: CalendarChevron }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
