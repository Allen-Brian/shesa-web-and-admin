'use client';

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
