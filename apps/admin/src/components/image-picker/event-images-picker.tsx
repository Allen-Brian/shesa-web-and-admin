'use client';

/**
 * EventImagesPicker — upload + manage the ordered list of advert
 * images for an event. The first URL in the list is the hero cover
 * on the detail page; the rest are gallery slots.
 *
 * Flow:
 *   - Admin picks one or more files from an <input type="file">.
 *   - Each file goes through the uploadEventAdvertImage Server
 *     Action (service-role writes to `event-advert-images` in
 *     Storage; the caller must be signed in).
 *   - On success the returned public URL joins the internal list.
 *   - A hidden JSON input (name = `hiddenInputName`) carries the
 *     ordered URL list into the enclosing form's FormData.
 *
 * Reorder is up/down buttons — dnd-kit is overkill for a max-10
 * list; drag-reorder is a follow-up polish.
 */

import { useMemo, useRef, useState, useTransition } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2 } from 'lucide-react';

import { Button, toast } from '@shesa/ui';

import { uploadEventAdvertImage } from '@/app/(personas)/exco/events/event-image-actions';

export interface EventImagesPickerProps {
  /** Hidden input's name attribute — the form reads FormData.get(name). */
  readonly hiddenInputName?: string;
  readonly maxImages?: number;
  readonly initialUrls?: readonly string[];
}

const DEFAULT_HIDDEN_INPUT_NAME = 'advertImageUrlsJson';

export function EventImagesPicker({
  hiddenInputName = DEFAULT_HIDDEN_INPUT_NAME,
  maxImages = 10,
  initialUrls = [],
}: EventImagesPickerProps) {
  const [urls, setUrls] = useState<readonly string[]>(initialUrls);
  const [uploading, startUpload] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const serialized = useMemo(() => JSON.stringify(urls), [urls]);
  const isFull = urls.length >= maxImages;

  const onSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const available = Math.max(0, maxImages - urls.length);
    const toUpload = Array.from(files).slice(0, available);
    if (toUpload.length < files.length) {
      toast.error(`Limit is ${maxImages} images — kept the first ${toUpload.length}.`);
    }

    startUpload(async () => {
      const results = await Promise.all(
        toUpload.map(async (f) => {
          const fd = new FormData();
          fd.set('file', f);
          const r = await uploadEventAdvertImage(fd);
          return { file: f, result: r };
        }),
      );
      const nextUrls: string[] = [];
      let failures = 0;
      for (const { file, result } of results) {
        if (result.ok) nextUrls.push(result.url);
        else {
          failures += 1;
          console.warn(`Upload failed for ${file.name}:`, result.message);
        }
      }
      if (nextUrls.length > 0) {
        setUrls((prev) => [...prev, ...nextUrls]);
        toast.success(`${nextUrls.length} image${nextUrls.length === 1 ? '' : 's'} uploaded.`);
      }
      if (failures > 0) {
        const first = results.find((r) => !r.result.ok);
        toast.error(
          first && !first.result.ok
            ? first.result.message
            : `${failures} upload${failures === 1 ? '' : 's'} failed.`,
        );
      }
      // Reset the input so re-selecting the same file re-triggers.
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
  };

  const remove = (idx: number) => setUrls((prev) => prev.filter((_, i) => i !== idx));

  const swap = (idx: number, delta: -1 | 1) =>
    setUrls((prev) => {
      const next = [...prev];
      const target = idx + delta;
      if (target < 0 || target >= next.length) return prev;
      const a = next[idx];
      const b = next[target];
      if (a === undefined || b === undefined) return prev;
      next[idx] = b;
      next[target] = a;
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        onChange={(e) => onSelect(e.target.files)}
        className="hidden"
        id="event-advert-images-input"
      />

      {urls.length === 0 && (
        <label
          htmlFor="event-advert-images-input"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-4 py-10 text-center transition-colors hover:border-foreground/40"
        >
          <ImagePlus className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium">Upload banner + gallery images</span>
          <span className="text-xs text-muted-foreground">
            JPEG / PNG / WebP / AVIF · up to 5 MB each · first image is the banner
          </span>
        </label>
      )}

      {urls.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {urls.map((url, idx) => (
            <div
              key={url}
              className="group relative aspect-video overflow-hidden rounded-md border border-border bg-muted"
            >
              {/* Plain <img> — remote-image config for Next Image is
               * not wired for arbitrary Storage URLs yet. onError logs
               * the URL that failed so a broken thumbnail is easy to
               * trace back to a bad bucket path / policy mistake. */}
              <img
                src={url}
                alt={`Advert image ${idx + 1}`}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => console.warn('EventImagesPicker: failed to load', url)}
              />
              {idx === 0 && (
                <div className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary-foreground">
                  <Star className="h-3 w-3" />
                  Banner
                </div>
              )}
              <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={idx === 0}
                  onClick={() => swap(idx, -1)}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={idx === urls.length - 1}
                  onClick={() => swap(idx, 1)}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => remove(idx)}
                  aria-label="Remove image"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {urls.length > 0 && !isFull && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start gap-2"
          onClick={() => fileInputRef.current?.click()}
          loading={uploading}
          disabled={uploading}
        >
          <ImagePlus className="h-4 w-4" />
          {uploading ? 'Uploading…' : 'Add more'}
        </Button>
      )}
      {isFull && (
        <p className="text-xs text-muted-foreground">
          Reached the {maxImages}-image cap. Remove one to add another.
        </p>
      )}

      <input type="hidden" name={hiddenInputName} value={serialized} readOnly />
    </div>
  );
}
