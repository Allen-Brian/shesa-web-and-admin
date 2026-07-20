'use client';

import { useRef, useState, useTransition } from 'react';
import { Film, Loader2, Plus, Upload } from 'lucide-react';

import { Button, toast } from '@shesa/ui';

import { uploadAlbumMedia } from '../actions/photo-actions';
import { createMediaItem } from '../actions/media';
import type { MediaKind } from '../actions/types';
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

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    startUpload(async () => {
      const up = await uploadAlbumMedia(fd);
      if (!up.ok) {
        toast.error(up.message);
        return;
      }
      const created = await createMediaItem({
        albumId,
        kind: up.kind as MediaKind,
        src: up.url,
        aspect: up.kind === 'video' ? '16/9' : '4/3',
        sortOrder: nextSort,
      });
      if (!created.ok) {
        toast.error(created.message);
        return;
      }
      toast.success(up.kind === 'video' ? 'Video added.' : 'Photo added.');
      onAdded();
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
        Upload photo or video
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setVideoOpen(true)}
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
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
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
