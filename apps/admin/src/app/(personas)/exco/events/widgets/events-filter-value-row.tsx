'use client';

import { cn } from '@shesa/ui';

interface EventsFilterValueRowProps {
  readonly label: string;
  readonly active: boolean;
  readonly onClick: () => void;
  readonly checkbox?: boolean;
}

/**
 * Single value row in the filter dropdown's right pane. Renders as a
 * radio when `checkbox` is false (single-select dimension like Mode),
 * and as a checkbox when true (multi-select dimension like Event type).
 */
export function EventsFilterValueRow({
  label,
  active,
  onClick,
  checkbox,
}: EventsFilterValueRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm transition-colors',
          active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60',
        )}
      >
        <span className="flex items-center gap-2">
          {checkbox ? (
            <span
              className={cn(
                'flex h-3.5 w-3.5 items-center justify-center rounded-sm border',
                active ? 'border-primary bg-primary' : 'border-input',
              )}
            >
              {active && (
                <svg
                  viewBox="0 0 12 12"
                  className="h-2.5 w-2.5 text-primary-foreground"
                  fill="none"
                >
                  <path
                    d="M2 6.5l2.5 2.5L10 3.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
          ) : (
            <span
              className={cn(
                'h-3.5 w-3.5 rounded-full border-2',
                active ? 'border-primary bg-primary' : 'border-input',
              )}
            />
          )}
          {label}
        </span>
      </button>
    </li>
  );
}
