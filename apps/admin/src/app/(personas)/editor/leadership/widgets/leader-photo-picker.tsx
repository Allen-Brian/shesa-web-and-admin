'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { Loader2, Upload, UserRound, X } from 'lucide-react';

import { Button, toast } from '@shesa/ui';

import { deleteLeaderPhoto, uploadLeaderPhoto } from '../actions/photo-actions';

interface Props {
  readonly value: string;
  readonly onChange: (nextUrl: string) => void;
  /** Label rendered above the picker (e.g. "Photo" or "President photo"). */
  readonly label?: string;
  /** Alt text used on the preview + fallback icon. */
  readonly alt: string;
  /** Size (px) of the square preview. */
  readonly size?: number;
}

/**
 * Single-image controlled picker used across every Leadership dialog.
 *   - Renders the current image (or an icon fallback) as a square.
 *   - Upload button opens the OS file picker; the file is sent to
 *     `uploadLeaderPhoto` and the returned public URL bubbles up via
 *     `onChange`.
 *   - Remove button clears the URL and best-effort deletes the blob.
 * Validation lives server-side; the client just surfaces the error.
 */
export function LeaderPhotoPicker({ value, onChange, label = 'Photo', alt, size = 96 }: Props) {
  const [pending, startTransition] = useTransition();
  const [clearing, setClearing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => fileRef.current?.click();

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    startTransition(async () => {
      const res = await uploadLeaderPhoto(fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      // If replacing an existing photo, drop the previous blob.
      if (value) void deleteLeaderPhoto(value);
      onChange(res.url);
      toast.success('Photo uploaded.');
    });
  };

  const clear = () => {
    if (!value) return;
    setClearing(true);
    const previous = value;
    onChange('');
    void deleteLeaderPhoto(previous).finally(() => setClearing(false));
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <div
          className="relative shrink-0 overflow-hidden rounded-md border border-border bg-muted"
          style={{ width: size, height: size }}
        >
          {value ? (
            <Image
              src={value}
              alt={alt}
              fill
              unoptimized
              sizes={`${size}px`}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <UserRound className="h-1/2 w-1/2" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openPicker}
            disabled={pending || clearing}
          >
            {pending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                {value ? 'Replace' : 'Upload photo'}
              </>
            )}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clear}
              disabled={pending || clearing}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">JPEG, PNG, WebP, or AVIF. Max 5 MB.</p>
    </div>
  );
}
