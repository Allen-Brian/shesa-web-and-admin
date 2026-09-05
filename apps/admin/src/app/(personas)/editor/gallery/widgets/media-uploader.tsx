'use client';

import { useRef, useState, useTransition } from 'react';
import { Film, Loader2, Plus, Upload } from 'lucide-react';

import { Button, toast } from '@shesa/ui';

import { measureImageAspect } from '@/lib/media/measure-aspect';

import { uploadAlbumMedia } from '../actions/photo-actions';
import { createMediaItem } from '../actions/media';
import type { MediaKind } from '../actions/gallery-action-types';
import { VideoUrlDialog } from './video-url-dialog';

interface Props {
  readonly albumId: string;
  readonly nextSort: number;
  readonly onAdded: () => void;
}

/**
 * "Add media" controls above the media grid. Two paths:
 *   • Upload — file picker for both images and videos, routed by MIME
 *     into `gallery/{user_id}/…` and inserted with the correct kind.
 *   • Add video by URL — for embedded videos (YouTube, Vimeo, direct
 *     MP4 URLs) where nothing is uploaded to storage.
 */
export function MediaUploader({ albumId, nextSort, onAdded }: Props) {
  const [uploading, startUpload] = useTransition();
  const [linking, startLink] = useTransition();
  const [videoOpen, setVideoOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => fileRef.current?.click();

  /**
   * Upload a whole selection, one file at a time.
   *
   * Sequential rather than parallel: each item needs its own sort order,
   * and a dozen concurrent multi-megabyte uploads on a Cameroonian
   * connection is a good way to have several of them time out. A file
   * that fails is reported and the rest carry on, so one bad photo does
   * not lose the other nineteen.
   */
  const onFiles = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    startUpload(async () => {
      let added = 0;
      const failed: string[] = [];

      for (const [i, file] of files.entries()) {
        const fd = new FormData();
        fd.set('file', file);

        const up = await uploadAlbumMedia(fd);
        if (!up.ok) {
          failed.push(file.name);
          continue;
        }

        const created = await createMediaItem({
          albumId,
          kind: up.kind as MediaKind,
          src: up.url,
          // Measured, not assumed — see measure-aspect.ts.
          aspect: up.kind === 'video' ? '16/9' : await measureImageAspect(file),
          sortOrder: nextSort + i,
        });
        if (!created.ok) {
          failed.push(file.name);
          continue;
        }
        added += 1;
      }

      if (added > 0) {
        toast.success(added === 1 ? 'Media added.' : `${added} items added.`);
        onAdded();
      }
      if (failed.length > 0) {
        toast.error(
          failed.length === 1
            ? `${failed[0]} could not be uploaded.`
            : `${failed.length} files could not be uploaded: ${failed.slice(0, 3).join(', ')}${
                failed.length > 3 ? '…' : ''
              }`,
        );
      }
    });
  };

  const onSubmitVideoUrl = (src: string, posterUrl: string) => {
    startLink(async () => {
      const created = await createMediaItem({
        albumId,
        kind: 'video',
        src,
        posterUrl: posterUrl || null,
        aspect: '16/9',
        sortOrder: nextSort,
      });
      if (!created.ok) {
        toast.error(created.message);
        return;
      }
      toast.success('Video linked.');
      setVideoOpen(false);
      onAdded();
    });
  };

  const busy = uploading || linking;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" onClick={openPicker} disabled={busy}>
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        Upload photos or videos
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setVideoOpen(true)}
        loading={busy}
        disabled={busy}
      >
        <Film className="h-3.5 w-3.5" />
        Add video by URL
      </Button>
      <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
        <Plus className="h-3 w-3" />
        Images ≤ 5 MB · Videos ≤ 100 MB
      </span>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
        multiple
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          if (fileRef.current) fileRef.current.value = '';
        }}
      />

      <VideoUrlDialog
        open={videoOpen}
        onOpenChange={setVideoOpen}
        pending={linking}
        onSubmit={onSubmitVideoUrl}
      />
    </div>
  );
}
