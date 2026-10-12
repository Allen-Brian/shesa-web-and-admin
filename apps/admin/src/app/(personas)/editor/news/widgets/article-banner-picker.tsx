'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { ImageIcon, Loader2, Upload, X } from 'lucide-react';

import { Button, toast } from '@shesa/ui';

import { deleteArticleImage, uploadArticleImage } from '../actions/photo-actions';

interface Props {
  readonly value: string;
  readonly onChange: (nextUrl: string) => void;
  readonly label?: string;
  readonly alt: string;
}

/**
 * Banner-picture picker for the article form. Landscape aspect ratio
 * (16 / 9) with a proportional preview so the editor sees the image
 * the way it'll appear on the site's article view + hero carousel.
 */
export function ArticleBannerPicker({ value, onChange, label = 'Banner picture', alt }: Props) {
  const [pending, startTransition] = useTransition();
  const [clearing, setClearing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => fileRef.current?.click();

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    startTransition(async () => {
      const res = await uploadArticleImage(fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      if (value) void deleteArticleImage(value);
      onChange(res.url);
      toast.success('Banner uploaded.');
    });
  };

  const clear = () => {
    if (!value) return;
    setClearing(true);
    const previous = value;
    onChange('');
    void deleteArticleImage(previous).finally(() => setClearing(false));
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-muted">
        {value ? (
          <Image src={value} alt={alt} fill unoptimized sizes="720px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">No banner yet</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
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
              {value ? 'Replace banner' : 'Upload banner'}
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
      <p className="text-[11px] text-muted-foreground">
        JPEG, PNG, WebP, or AVIF. Max 5 MB. Landscape recommended (16:9).
      </p>
    </div>
  );
}
