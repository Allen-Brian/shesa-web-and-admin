'use client';

import { useRef, useTransition } from 'react';
import Image from 'next/image';
import { ImageIcon, Loader2, Plus, X } from 'lucide-react';

import { Button, toast } from '@shesa/ui';

import { deleteEventImage, uploadEventImage } from '../actions/photo-actions';

interface Props {
  readonly flyers: readonly string[];
  readonly onChange: (next: readonly string[]) => void;
}

/**
 * Ordered gallery editor for a featured event's flyer images. Add via
 * file picker, click × to remove one. Storage lives in the shared
 * `cms-media` bucket; removal is best-effort (silent on error) so a
 * transient network hiccup can't block a save.
 */
export function FlyersEditor({ flyers, onChange }: Props) {
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => fileRef.current?.click();

  /**
   * Upload every file the picker returned, one after another. Uploads
   * run in series so a large selection cannot swamp a slow connection,
   * and the successful ones are kept even if some fail.
   */
  const onFiles = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    startTransition(async () => {
      const added: string[] = [];
      const failed: string[] = [];

      for (const file of files) {
        const fd = new FormData();
        fd.set('file', file);
        const res = await uploadEventImage(fd);
        if (res.ok) added.push(res.url);
        else failed.push(file.name);
      }

      if (added.length > 0) {
        onChange([...flyers, ...added]);
        toast.success(added.length === 1 ? 'Flyer added.' : `${added.length} flyers added.`);
      }
      if (failed.length > 0) {
        toast.error(
          failed.length === 1
            ? `${failed[0]} could not be uploaded.`
            : `${failed.length} files could not be uploaded.`,
        );
      }
    });
  };

  const remove = (idx: number) => {
    const target = flyers[idx];
    if (target) void deleteEventImage(target);
    onChange(flyers.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Flyers / posters</span>
        <Button type="button" variant="ghost" size="sm" onClick={openPicker} disabled={pending}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Add flyers
        </Button>
      </div>

      {flyers.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          <ImageIcon className="mr-1 inline h-3 w-3" />
          No flyers yet. Add posters or additional promotional images.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {flyers.map((url, idx) => (
            <li
              key={url}
              className="relative aspect-3/4 overflow-hidden rounded-md border border-border bg-muted"
            >
              <Image
                src={url}
                alt={`Flyer ${idx + 1}`}
                fill
                unoptimized
                sizes="240px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white hover:bg-destructive"
                aria-label="Remove flyer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          if (fileRef.current) fileRef.current.value = '';
        }}
      />
    </div>
  );
}
