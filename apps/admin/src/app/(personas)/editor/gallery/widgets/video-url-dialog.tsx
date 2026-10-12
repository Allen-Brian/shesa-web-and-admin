'use client';

import { useState } from 'react';
import { Film } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@shesa/ui';

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly pending: boolean;
  readonly onSubmit: (src: string, posterUrl: string) => void;
}

/**
 * Modal for adding a video by URL. Supports both self-hosted MP4/WebM
 * URLs and embedded providers (YouTube, Vimeo). An optional poster URL
 * is captured for the thumbnail.
 */
export function VideoUrlDialog({ open, onOpenChange, pending, onSubmit }: Props) {
  const [src, setSrc] = useState('');
  const [poster, setPoster] = useState('');

  const submit = () => {
    const trimmed = src.trim();
    if (!trimmed) return;
    onSubmit(trimmed, poster.trim());
  };

  const reset = () => {
    setSrc('');
    setPoster('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-4 w-4" />
            Add video by URL
          </DialogTitle>
          <DialogDescription>
            Paste a direct MP4/WebM URL or a YouTube/Vimeo link. Add a poster image for the
            thumbnail — recommended for embedded links.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="video-src">Video URL</Label>
            <Input
              id="video-src"
              value={src}
              onChange={(e) => setSrc(e.target.value)}
              placeholder="https://…"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="video-poster">Poster image URL (optional)</Label>
            <Input
              id="video-poster"
              value={poster}
              onChange={(e) => setPoster(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            loading={pending}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !src.trim()}>
            Add video
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
