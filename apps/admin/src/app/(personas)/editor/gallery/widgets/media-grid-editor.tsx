'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus } from 'lucide-react';

import { ConfirmDialog, toast } from '@shesa/ui';

import { deleteAlbumMedia } from '../actions/photo-actions';
import { deleteMediaItem, reorderMedia, updateMediaItem } from '../actions/media';
import type { MediaAspect } from '../actions/gallery-action-types';
import { MediaGridCell } from './media-grid-cell';
import { MediaItemDialog } from './media-item-dialog';
import { MediaUploader } from './media-uploader';
import type { MediaRow } from './gallery-widget-types';

interface Props {
  readonly albumId: string;
  readonly items: readonly MediaRow[];
}

/**
 * Compact media manager. Renders a dense thumbnail grid — every cell
 * carries hover-only chrome (position badge, aspect chip, reorder,
 * delete). Clicking a cell opens an edit dialog for alt text and
 * aspect. Scales cleanly to 50+ items.
 */
export function MediaGridEditor({ albumId, items }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<MediaRow | null>(null);
  const [editing, setEditing] = useState<MediaRow | null>(null);

  const nextSort = items.length ? Math.max(...items.map((m) => m.sortOrder)) + 10 : 10;

  const doSave = (id: string, alt: string, aspect: MediaAspect) => {
    startTransition(async () => {
      const res = await updateMediaItem(id, { alt: alt.trim() || null, aspect });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Media updated.');
      setEditing(null);
      router.refresh();
    });
  };

  const doMove = (id: string, dir: 'up' | 'down') => {
    const idx = items.findIndex((m) => m.id === id);
    if (idx < 0) return;
    const other = dir === 'up' ? idx - 1 : idx + 1;
    if (other < 0 || other >= items.length) return;
    const a = items[idx]!;
    const b = items[other]!;
    startTransition(async () => {
      const res = await reorderMedia([
        { id: a.id, sortOrder: b.sortOrder },
        { id: b.id, sortOrder: a.sortOrder },
      ]);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      router.refresh();
    });
  };

  const doDelete = (item: MediaRow) => {
    startTransition(async () => {
      const res = await deleteMediaItem(item.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      void deleteAlbumMedia(item.src);
      if (item.posterUrl) void deleteAlbumMedia(item.posterUrl);
      toast.success('Media removed.');
      setConfirm(null);
      setEditing((current) => (current?.id === item.id ? null : current));
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">Media</span>
          <span className="text-xs text-muted-foreground">
            {items.length} item{items.length === 1 ? '' : 's'} · click a tile to edit
          </span>
        </div>
      </div>

      <MediaUploader albumId={albumId} nextSort={nextSort} onAdded={() => router.refresh()} />

      {items.length === 0 ? (
        <p className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground">
          <ImagePlus className="h-4 w-4" />
          No media yet. Upload photos or videos, or add a video by URL.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {items.map((item, i) => (
            <li key={item.id}>
              <MediaGridCell
                item={item}
                index={i}
                canMoveUp={i > 0}
                canMoveDown={i < items.length - 1}
                pending={pending}
                onOpen={setEditing}
                onMove={doMove}
                onDelete={setConfirm}
              />
            </li>
          ))}
        </ul>
      )}

      <MediaItemDialog
        open={!!editing}
        item={editing}
        pending={pending}
        onOpenChange={(open) => !open && setEditing(null)}
        onSave={doSave}
        onDelete={setConfirm}
      />

      <ConfirmDialog
        open={!!confirm}
        title="Remove this media item?"
        description="The file is deleted from the album and from storage. This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => confirm && doDelete(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
