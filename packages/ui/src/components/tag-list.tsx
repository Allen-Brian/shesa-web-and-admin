'use client';

import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Tag, type TagColorTheme, type TagSize } from './tag';
import { cn } from '../lib/cn';

export interface TagListItem {
  name: string;
  colorTheme?: TagColorTheme;
  color?: string;
}

interface TagListProps {
  tags: TagListItem[];
  /** Number of tags rendered inline before the "+N" overflow chip. Default 3. */
  maxVisible?: number;
  size?: TagSize;
  className?: string;
  /** Override for the overflow chip — defaults to `+{remainingCount}`. */
  overflowLabel?: (remaining: number) => React.ReactNode;
}

/**
 * Inline tag list with an overflow popover. Renders the first `maxVisible`
 * tags, then a `+N` chip that pops up the remaining ones. Ported from the
 * Vue TagList molecule; the popover is implemented with Radix Popover so
 * positioning, click-outside, and ESC handling come for free.
 */
export function TagList({
  tags,
  maxVisible = 3,
  size = 1,
  className,
  overflowLabel,
}: TagListProps) {
  const visible = tags.slice(0, maxVisible);
  const hidden = tags.slice(maxVisible);
  const remaining = hidden.length;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {visible.map((tag, i) => (
        <Tag
          key={`tag-${i}`}
          text={tag.name}
          colorTheme={tag.colorTheme}
          color={tag.color}
          size={size}
        />
      ))}

      {remaining > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex h-[26px] items-center justify-center rounded-full border border-border bg-muted px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              {overflowLabel ? overflowLabel(remaining) : `+${remaining}`}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={6}
            className="w-[250px] p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap gap-2">
              {hidden.map((tag, i) => (
                <Tag
                  key={`hidden-${i}`}
                  text={tag.name}
                  colorTheme={tag.colorTheme}
                  color={tag.color}
                  size={size}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
