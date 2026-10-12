import * as React from 'react';
import { cn } from '../lib/cn';

interface ColSpec {
  width?: string;
  flex?: number;
}

interface TableSkeletonProps {
  rows?: number;
  cols?: ColSpec[];
  className?: string;
  showCheckbox?: boolean;
}

function SkeletonBar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('animate-pulse rounded bg-muted/70', className)} style={style} />;
}

const DEFAULT_COLS: ColSpec[] = [
  { flex: 2 },
  { flex: 1 },
  { flex: 1 },
  { width: '100px' },
  { width: '80px' },
];

export function TableSkeleton({
  rows = 10,
  cols = DEFAULT_COLS,
  className,
  showCheckbox = false,
}: TableSkeletonProps) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card', className)}>
      {/* Header row */}
      <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
        {showCheckbox && <SkeletonBar className="h-4 w-4 shrink-0 rounded" />}
        {cols.map((col, i) => (
          <div
            key={i}
            style={{
              width: col.width,
              flex: col.width ? undefined : (col.flex ?? 1),
            }}
          >
            <SkeletonBar className="h-3.5 w-3/4" />
          </div>
        ))}
      </div>

      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center gap-3 border-b border-border px-4 last:border-0"
          style={{ height: 65 }}
        >
          {showCheckbox && <SkeletonBar className="h-4 w-4 shrink-0 rounded" />}
          {cols.map((col, colIdx) => (
            <div
              key={colIdx}
              style={{
                width: col.width,
                flex: col.width ? undefined : (col.flex ?? 1),
              }}
            >
              {colIdx === 0 ? (
                <div className="space-y-1.5">
                  <SkeletonBar
                    className="h-3.5"
                    style={
                      { width: `${55 + ((rowIdx * 17 + colIdx * 7) % 30)}%` } as React.CSSProperties
                    }
                  />
                  <SkeletonBar
                    className="h-3"
                    style={
                      { width: `${35 + ((rowIdx * 13 + colIdx * 5) % 25)}%` } as React.CSSProperties
                    }
                  />
                </div>
              ) : (
                <SkeletonBar
                  className="h-3.5"
                  style={
                    { width: `${50 + ((rowIdx * 11 + colIdx * 9) % 35)}%` } as React.CSSProperties
                  }
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
