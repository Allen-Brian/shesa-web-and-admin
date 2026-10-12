'use client';

import type { ColDef } from '@shesa/ui';

/**
 * A table cell that wraps to two lines and then stops.
 *
 * Citations, award descriptions and lists of spellings are all free text a
 * member typed, so they have no length anyone controls. One line with an
 * ellipsis loses the sentence; unbounded wrapping gives one row the height
 * of a paragraph and pushes everything else off the screen. Two lines is
 * enough to tell whether a citation is serious, and the row opens for the
 * rest.
 *
 * AG Grid's cells are `display: flex; align-items: center`, so the clamp has
 * to live on an inner span — the flex child is what actually holds the text.
 */
export function ClampedCell({
  text,
  className = 'text-xs text-muted-foreground',
}: {
  readonly text: string | null | undefined;
  readonly className?: string;
}) {
  if (!text) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <span className="flex h-full items-center py-2">
      <span className={`line-clamp-2 whitespace-normal break-words leading-[1.45] ${className}`}>
        {text}
      </span>
    </span>
  );
}

/**
 * Row height for a table carrying clamped text.
 *
 * Two lines at 12px on 1.45 leading is ~35px, plus the vertical padding the
 * other tables use — close enough to the 65px default that the voting tables
 * do not look like a different product.
 */
export const CLAMPED_ROW_HEIGHT = 68;

/**
 * The row-number column every Voting table opens with.
 *
 * Read from the grid's own row index rather than from the data, so it counts
 * what is actually on screen: sort by nominations and the leader is 1,
 * filter to ungrouped and the remaining rows renumber from 1. A number
 * stored on the row would keep the order the server happened to send and
 * disagree with the table the moment anyone sorted it.
 *
 * Not sortable or filterable for the same reason — there is nothing to sort
 * a position by.
 */
export function serialColumn<T>(): ColDef<T> {
  return {
    headerName: 'No.',
    colId: 'serial',
    width: 72,
    maxWidth: 72,
    sortable: false,
    filter: false,
    suppressMovable: true,
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    cellClass: 'text-xs text-muted-foreground tabular-nums',
  };
}
