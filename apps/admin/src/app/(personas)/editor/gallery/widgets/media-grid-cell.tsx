'use client';

import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';

import { MediaThumbnail } from './media-thumbnail';
import type { MediaRow } from './gallery-widget-types';

interface Props {
  readonly item: MediaRow;
  readonly index: number;
  readonly canMoveUp: boolean;
  readonly canMoveDown: boolean;
  readonly pending: boolean;
  readonly onOpen: (item: MediaRow) => void;
  readonly onMove: (id: string, dir: 'up' | 'down') => void;
  readonly onDelete: (item: MediaRow) => void;
}

/**
 * Compact grid cell for the media manager. Thumbnail fills the cell;
 * hovering surfaces the position badge, aspect chip, reorder arrows,
 * and delete. Clicking anywhere else opens the edit dialog.
 */
export function MediaGridCell({
  item,
  index,
  canMoveUp,
  canMoveDown,
  pending,
  onOpen,
  onMove,
  onDelete,
}: Props) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      disabled={pending}
      aria-label={`Edit ${item.alt || `item ${index + 1}`}`}
      className="group relative block aspect-square w-full overflow-hidden rounded-md border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/60"
    >
      <MediaThumbnail item={item} />

      {/* Position badge */}
      <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white">
        {index + 1}
      </span>

      {/* Hover-only chrome */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      />

      <div className="pointer-events-none absolute inset-x-1.5 bottom-1.5 flex items-end justify-between gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="pointer-events-auto rounded-sm bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {item.aspect}
        </span>
        <div className="pointer-events-auto flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              onMove(item.id, 'up');
            }}
            disabled={!canMoveUp || pending}
            aria-label="Move earlier"
            className="grid h-6 w-6 place-items-center rounded-sm bg-white/90 text-black shadow disabled:opacity-40 hover:bg-white"
          >
            <ArrowLeft className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              onMove(item.id, 'down');
            }}
            disabled={!canMoveDown || pending}
            aria-label="Move later"
            className="grid h-6 w-6 place-items-center rounded-sm bg-white/90 text-black shadow disabled:opacity-40 hover:bg-white"
          >
            <ArrowRight className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              onDelete(item);
            }}
            disabled={pending}
            aria-label="Delete"
            className="grid h-6 w-6 place-items-center rounded-sm bg-white/90 text-destructive shadow hover:bg-destructive hover:text-white"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </button>
  );
}
