'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { Loader2, Upload, UserRound, X } from 'lucide-react';

import { Button, toast } from '@shesa/ui';

import { deleteArticleImage, uploadArticleImage } from '../actions/photo-actions';

interface Props {
  readonly value: string;
  readonly onChange: (nextUrl: string) => void;
  readonly alt: string;
}

/**
 * Small square photo picker for the article author. Optional — when
 * unset, the public site renders the author's initials in the avatar
 * (like Google does).
 */
export function AuthorPhotoPicker({ value, onChange, alt }: Props) {
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
      toast.success('Photo uploaded.');
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
      <span className="text-sm font-medium text-foreground">Author photo (optional)</span>
      <div className="flex items-center gap-3">
        <div
          className="relative shrink-0 overflow-hidden rounded-full border border-border bg-muted"
          style={{ width: 72, height: 72 }}
        >
          {value ? (
            <Image src={value} alt={alt} fill unoptimized sizes="72px" className="object-cover" />
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
                {value ? 'Replace' : 'Upload'}
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
      <p className="text-[11px] text-muted-foreground">
        Optional. When empty the public site shows the author&apos;s initials.
      </p>
    </div>
  );
}
