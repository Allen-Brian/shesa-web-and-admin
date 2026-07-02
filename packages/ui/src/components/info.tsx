'use client';

import * as React from 'react';
import { cn } from '../lib/cn';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface InfoProps {
  /** Tooltip body — supports plain text or arbitrary React nodes. */
  children: React.ReactNode;
  /** Trigger icon size in pixels. Defaults to 16 (matches the Vue port). */
  size?: number;
  className?: string;
  /** Tooltip placement; AG Grid headers may want `right`/`bottom` instead. */
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Small contextual-help icon. Hovering / focusing reveals a tooltip with the
 * provided content. Mirrors the Vue `<Info />` atom: an info-circle SVG with
 * the muted-foreground tint, slightly heavier on hover.
 *
 * Self-wrapped in a `TooltipProvider` so consumers don't need a provider
 * ancestor — drop it next to any label and it just works.
 */
export function Info({ children, size = 16, className, side = 'top' }: InfoProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            role="img"
            aria-label="More info"
            className={cn(
              'inline-flex shrink-0 cursor-help items-center justify-center text-muted-foreground/70 transition-colors hover:text-muted-foreground focus:outline-none focus-visible:text-muted-foreground',
              className,
            )}
            style={{ width: size, height: size }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={size}
              height={size}
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
            >
              <g>
                <path
                  d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7.5 7.5C7.63261 7.5 7.75979 7.55268 7.85355 7.64645C7.94732 7.74021 8 7.86739 8 8V10.5C8 10.6326 8.05268 10.7598 8.14645 10.8536C8.24021 10.9473 8.36739 11 8.5 11"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7.75 6C8.16421 6 8.5 5.66421 8.5 5.25C8.5 4.83579 8.16421 4.5 7.75 4.5C7.33579 4.5 7 4.83579 7 5.25C7 5.66421 7.33579 6 7.75 6Z"
                  fill="currentColor"
                />
              </g>
            </svg>
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-xs">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
