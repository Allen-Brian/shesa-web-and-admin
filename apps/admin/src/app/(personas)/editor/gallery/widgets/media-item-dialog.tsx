'use client';

import { useEffect, useState } from 'react';
import { Film, Image as ImageIcon, Save, Trash2 } from 'lucide-react';

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

import type { MediaAspect } from '../actions/gallery-action-types';
import { MediaThumbnail } from './media-thumbnail';
import type { MediaRow } from './gallery-widget-types';

const ASPECT_OPTIONS: readonly MediaAspect[] = ['1/1', '3/4', '4/3', '3/2', '2/3', '16/9', '9/16'];

interface Props {
  readonly open: boolean;
  readonly item: MediaRow | null;
  readonly pending: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (id: string, alt: string, aspect: MediaAspect) => void;
  readonly onDelete: (item: MediaRow) => void;
}

/**
 * Edit dialog for a single media item. Opens when the editor clicks a
 * cell in the media grid — keeps the grid itself compact by moving
 * alt-text / aspect editing behind a click.
 */
export function MediaItemDialog({ open, item, pending, onOpenChange, onSave, onDelete }: Props) {
  const [alt, setAlt] = useState('');
  const [aspect, setAspect] = useState<MediaAspect>('4/3');

  useEffect(() => {
    if (item) {
      setAlt(item.alt ?? '');
      setAspect(item.aspect);
    }
  }, [item]);

  if (!item) return null;
  const dirty = alt !== (item.alt ?? '') || aspect !== item.aspect;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item.kind === 'video' ? (
              <Film className="h-4 w-4" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            Media details
          </DialogTitle>
          <DialogDescription>
            Set the alt text used by screen readers and adjust the aspect ratio for the grid.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-border bg-muted">
            <MediaThumbnail item={item} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="md-alt">Alt text</Label>
            <Input
              id="md-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Short description of the picture or clip"
              maxLength={140}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="md-aspect">Aspect ratio</Label>
            <select
              id="md-aspect"
              value={aspect}
              onChange={(e) => setAspect(e.target.value as MediaAspect)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              {ASPECT_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter className="items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item)}
            loading={pending}
            disabled={pending}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              loading={pending}
              disabled={pending}
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!dirty || pending}
              onClick={() => onSave(item.id, alt, aspect)}
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
