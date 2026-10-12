'use client';

import * as React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { GridApi } from 'ag-grid-community';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../dropdown-menu';
import { cn } from '../../lib/cn';

interface TablePaginationProps {
  api: GridApi | null;
  pageSize: number;
  pageSizeOptions: number[];
  onPageSizeChange: (size: number) => void;
}

/**
 * Footer pagination control. Reads page state from AG Grid
 * (`paginationGet*` + `paginationChanged` event) and renders our own visual
 * affordances — page indicator, prev/next + numbered buttons with collapse
 * ellipses, and a page-size dropdown. AG Grid still owns the slicing; this is
 * just the chrome.
 *
 * The 3-section layout (indicator | buttons | size) is rendered unconditionally
 * even when there's only one page so the footer height never collapses.
 */
export function TablePagination({
  api,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
}: TablePaginationProps) {
  const [currentPage, setCurrentPage] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);

  React.useEffect(() => {
    if (!api) return;
    const update = () => {
      setCurrentPage(api.paginationGetCurrentPage());
      setTotalPages(Math.max(1, api.paginationGetTotalPages()));
    };
    update();
    api.addEventListener('paginationChanged', update);
    return () => api.removeEventListener('paginationChanged', update);
  }, [api]);

  const goTo = (page: number) => api?.paginationGoToPage(page);

  return (
    <div className="flex h-11 items-center justify-between gap-5 px-1">
      <span className="min-w-[90px] text-sm text-muted-foreground">
        Page {currentPage + 1} of {totalPages}
      </span>

      <div className="flex items-center gap-2">
        <PageButton
          aria-label="Previous page"
          disabled={currentPage === 0}
          onClick={() => goTo(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </PageButton>

        {buildVisiblePages(currentPage + 1, totalPages).map((p, i) =>
          typeof p === 'string' ? (
            <span key={`${p}-${i}`} className="px-1 text-sm text-muted-foreground" aria-hidden>
              …
            </span>
          ) : (
            <PageButton key={p} current={p === currentPage + 1} onClick={() => goTo(p - 1)}>
              {p}
            </PageButton>
          ),
        )}

        <PageButton
          aria-label="Next page"
          disabled={currentPage + 1 >= totalPages}
          onClick={() => goTo(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </PageButton>
      </div>

      <PageSizeSelect pageSize={pageSize} options={pageSizeOptions} onChange={onPageSizeChange} />
    </div>
  );
}

function PageButton({
  children,
  current,
  disabled,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { current?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-border bg-card px-2 text-sm transition-colors',
        'hover:bg-muted hover:text-white disabled:pointer-events-none disabled:opacity-40',
        // Suppress browser/Tailwind focus rings — user-driven preference.
        'focus:outline-none focus-visible:outline-none focus-visible:ring-0',
        current && 'border-primary text-primary hover:bg-primary',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function PageSizeSelect({
  pageSize,
  options,
  onChange,
}: {
  pageSize: number;
  options: number[];
  onChange: (size: number) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 min-w-[125px] items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-sm transition-colors hover:bg-muted focus:outline-none focus-visible:outline-none focus-visible:ring-0"
        >
          {pageSize} per page
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="min-w-[125px]">
        {options.map((opt) => (
          <DropdownMenuItem key={opt} onSelect={() => onChange(opt)}>
            {opt} per page
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Page-number visibility logic ported from the Vue impl. Always shows page 1
 * and the last page; collapses the middle band with ellipses when current is
 * far from either end.
 */
function buildVisiblePages(
  current: number,
  total: number,
): (number | 'dots-left' | 'dots-right')[] {
  if (total <= 1) return [1];

  const maxVisible = 5;
  const pages: (number | 'dots-left' | 'dots-right')[] = [];

  const showLeftDots = current > 3;
  const showRightDots = current < total - 2;

  pages.push(1);

  if (showLeftDots && !showRightDots) {
    pages.push('dots-left');
    for (let i = total - (maxVisible - 2); i < total; i++) pages.push(i);
  } else if (!showLeftDots && showRightDots) {
    for (let i = 2; i <= maxVisible - 1; i++) pages.push(i);
    pages.push('dots-right');
  } else if (showLeftDots && showRightDots) {
    pages.push('dots-left');
    for (let i = current - 1; i <= current + 1; i++) pages.push(i);
    pages.push('dots-right');
  } else {
    for (let i = 2; i < total; i++) pages.push(i);
  }

  pages.push(total);
  return pages;
}
