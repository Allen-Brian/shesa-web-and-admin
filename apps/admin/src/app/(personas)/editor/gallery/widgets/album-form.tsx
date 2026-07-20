'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Trash2 } from 'lucide-react';

import { Button, ConfirmDialog, Input, Label, Textarea, toast } from '@shesa/ui';

import { createAlbum, deleteAlbum, updateAlbum } from '../actions/albums';
import type { AlbumInput } from '../actions/types';
import { AlbumCoverPicker } from './album-cover-picker';
import { CategoryManagerDialog } from './category-manager-dialog';
import { CategoryPicker } from './category-picker';
import { EventLinker } from './event-linker';
import { MediaGridEditor } from './media-grid-editor';
import { slugify } from './slugify';
import type { AlbumRow, CategoryRow, LinkableEvent, MediaRow } from './types';

interface Props {
  readonly categories: readonly CategoryRow[];
  readonly events: readonly LinkableEvent[];
  readonly editing?: AlbumRow | null;
  readonly media?: readonly MediaRow[];
}

/**
 * Full album form. Media management (upload / reorder / delete) is
 * only rendered when editing an existing album so uploads always
 * belong to a real `album_id`. Creating a new album just persists the
 * shell and redirects to the edit page where the grid becomes available.
 */
export function AlbumForm({ categories, events, editing, media = [] }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(editing?.title ?? '');
  const [slug, setSlug] = useState(editing?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!editing);
  const [dateLabel, setDateLabel] = useState(editing?.dateLabel ?? '');
  const [location, setLocation] = useState(editing?.location ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [coverUrl, setCoverUrl] = useState(editing?.coverUrl ?? '');
  const [photographer, setPhotographer] = useState(editing?.photographer ?? '');
  const [linkedEventId, setLinkedEventId] = useState<string | null>(editing?.linkedEventId ?? null);
  const [categoryIds, setCategoryIds] = useState<string[]>(editing ? [...editing.categoryIds] : []);
  const [manageOpen, setManageOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      toast.error('Title is required.');
      return;
    }
    if (!slug.trim()) {
      toast.error('Slug is required.');
      return;
    }

    const payload: AlbumInput = {
      slug,
      title,
      dateLabel: dateLabel || null,
      location: location || null,
      description: description || null,
      coverUrl: coverUrl || null,
      photographer: photographer || null,
      linkedEventId,
      sortOrder: editing?.sortOrder ?? 999,
      categoryIds,
    };

    startTransition(async () => {
      const res = editing ? await updateAlbum(editing.id, payload) : await createAlbum(payload);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(editing ? 'Album saved.' : 'Album created.');
      const newId = editing ? editing.id : (res.data as { id: string })?.id;
      router.push(newId ? `/editor/gallery/${newId}/edit` : '/editor/gallery');
    });
  };

  const runDelete = () => {
    if (!editing) return;
    startTransition(async () => {
      const res = await deleteAlbum(editing.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Album deleted.');
      router.push('/editor/gallery');
    });
  };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left column — main content */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="al-title">Title</Label>
            <Input
              id="al-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="AGM 2024"
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="al-slug">Slug</Label>
            <Input
              id="al-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="agm-2024"
              maxLength={120}
            />
            <p className="text-[11px] text-muted-foreground">Public URL: /gallery/{slug || '…'}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="al-date">Date label</Label>
              <Input
                id="al-date"
                value={dateLabel}
                onChange={(e) => setDateLabel(e.target.value)}
                placeholder="November 2024"
                maxLength={80}
              />
              <p className="text-[11px] text-muted-foreground">
                Free-form text — “November 2024”, “August 2024”, etc.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="al-location">Location</Label>
              <Input
                id="al-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ayaba Hotel · Bamenda"
                maxLength={200}
              />
            </div>
          </div>

          <AlbumCoverPicker value={coverUrl} onChange={setCoverUrl} alt={title || 'Cover'} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="al-description">Description</Label>
            <Textarea
              id="al-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One or two sentences summarising the album."
              maxLength={800}
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="al-photographer">Photographer credit (optional)</Label>
            <Input
              id="al-photographer"
              value={photographer}
              onChange={(e) => setPhotographer(e.target.value)}
              placeholder="Ndifon Peter"
              maxLength={200}
            />
          </div>

          {editing && (
            <div className="rounded-lg border border-border bg-muted/10 p-4">
              <MediaGridEditor albumId={editing.id} items={media} />
            </div>
          )}
        </div>

        {/* Right column — meta */}
        <aside className="flex flex-col gap-6">
          {/* Sticky action bar */}
          <div className="sticky top-4 z-10 flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-[0_4px_18px_-8px_rgba(0,0,0,0.15)]">
            <Button type="submit" size="sm" disabled={pending} className="w-full">
              <Save className="h-3.5 w-3.5" />
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create album'}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <EventLinker events={events} value={linkedEventId} onChange={setLinkedEventId} />

          <CategoryPicker
            categories={categories}
            selectedIds={categoryIds}
            onToggle={toggleCategory}
            onManage={() => setManageOpen(true)}
          />
        </aside>
      </div>

      <CategoryManagerDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        categories={categories}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={editing ? `Delete "${editing.title}"?` : ''}
        description="The album and all of its media items will be removed from the public gallery."
        confirmLabel={pending ? 'Deleting…' : 'Delete'}
        onConfirm={runDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}
