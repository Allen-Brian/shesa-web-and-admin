import * as React from 'react';
import { cn } from '../../lib/cn';
import { Skeleton } from '../skeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  rowHeight?: number;
  headerHeight?: number;
  variant?: 'basic' | 'border';
  className?: string;
}

/**
 * Loading placeholder that matches the DataTable's visual structure: a header
 * strip and N body rows at the supplied row height. The variant prop mirrors
 * DataTable so the skeleton inherits the border + rounded-corner treatment.
 */
export function TableSkeleton({
  rows = 8,
  columns = 6,
  rowHeight = 65,
  headerHeight = 48,
  variant = 'border',
  className,
}: TableSkeletonProps) {
  const cells = Array.from({ length: columns });
  return (
    <div
      className={cn(
        'w-full overflow-hidden',
        variant === 'border' && 'rounded-xl border border-border bg-card',
        className,
      )}
    >
      <div
        style={{ height: headerHeight }}
        className="flex items-center gap-4 border-b border-border px-4"
      >
        {cells.map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{ height: rowHeight }}
          className="flex items-center gap-4 border-b border-border px-4 last:border-b-0"
        >
          {cells.map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
