'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Save, Trash2 } from 'lucide-react';

import { Button, ConfirmDialog, Input, Label, Textarea, toast } from '@shesa/ui';

import { createSong, deleteSong, updateSong } from '../actions/songs';
import type { SongInput } from '../actions/song-action-types';
import { GroupManagerDialog } from './group-manager-dialog';
import { GroupSelect } from './group-select';
import { SongAudioPicker } from './song-audio-picker';
import { SongCoverPicker } from './song-cover-picker';
import { slugify } from '@shesa/domain/utils';
import type { GroupRow, SongRow } from './song-widget-types';

interface Props {
  readonly groups: readonly GroupRow[];
  readonly editing?: SongRow | null;
}

export function SongForm({ groups, editing }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(editing?.title ?? '');
  const [slug, setSlug] = useState(editing?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!editing);
  const [groupId, setGroupId] = useState<string>(editing?.groupId ?? groups[0]?.id ?? '');
  const [performer, setPerformer] = useState(editing?.performer ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [audioUrl, setAudioUrl] = useState(editing?.audioUrl ?? '');
  const [durationSeconds, setDurationSeconds] = useState<number | null>(
    editing?.durationSeconds ?? null,
  );
  const [coverUrl, setCoverUrl] = useState(editing?.coverUrl ?? '');
  const [lyrics, setLyrics] = useState(editing?.lyrics ?? '');
  const [manageOpen, setManageOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  // Which button was pressed. A ref rather than state: it is read once
  // inside the transition and must not trigger a render of its own.
  const intent = useRef<'close' | 'again'>('close');

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
    if (!groupId) {
      toast.error('Pick a group.');
      return;
    }
    if (!audioUrl.trim()) {
      toast.error('Audio is required.');
      return;
    }

    const payload: SongInput = {
      groupId,
      slug,
      title,
      performer: performer || null,
      description: description || null,
      audioUrl,
      coverUrl: coverUrl || null,
      durationSeconds,
      lyrics: lyrics || null,
      sortOrder: editing?.sortOrder ?? 999,
    };

    startTransition(async () => {
      const res = editing ? await updateSong(editing.id, payload) : await createSong(payload);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(editing ? 'Song saved.' : 'Song created.');

      // "Save and add another" keeps the editor in the form; the plain
      // save returns to the list, which is where someone who is done
      // wants to be. Landing on the edit page of what you just saved,
      // as this did before, is neither.
      if (intent.current === 'again') {
        if (editing) {
          router.push('/editor/songs/new');
          return;
        }
        resetForm();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      router.push('/editor/songs');
    });
  };

  /** Back to a blank create form, ready for the next track. */
  const resetForm = () => {
    setTitle('');
    setSlug('');
    setSlugTouched(false);
    setPerformer('');
    setDescription('');
    setAudioUrl('');
    setCoverUrl('');
    setLyrics('');
  };

  const runDelete = () => {
    if (!editing) return;
    startTransition(async () => {
      const res = await deleteSong(editing.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Song deleted.');
      router.push('/editor/songs');
    });
  };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left column — main content */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sg-title">Title</Label>
            <Input
              id="sg-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The SHESA Anthem"
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sg-slug">Slug</Label>
              <Input
                id="sg-slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                placeholder="the-shesa-anthem"
                maxLength={120}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sg-performer">Performer</Label>
              <Input
                id="sg-performer"
                value={performer}
                onChange={(e) => setPerformer(e.target.value)}
                placeholder="National Choir"
                maxLength={200}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sg-duration">Duration (seconds)</Label>
            <Input
              id="sg-duration"
              type="number"
              min="1"
              value={durationSeconds ?? ''}
              onChange={(e) =>
                setDurationSeconds(e.target.value ? Number.parseInt(e.target.value, 10) : null)
              }
              placeholder="Auto-detected on upload"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sg-desc">Description</Label>
            <Textarea
              id="sg-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short story about this piece."
              maxLength={800}
              rows={3}
            />
          </div>

          <SongAudioPicker
            value={audioUrl}
            duration={durationSeconds}
            onChange={(url, dur) => {
              setAudioUrl(url);
              if (dur != null) setDurationSeconds(dur);
            }}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="sg-lyrics">Lyrics (optional)</Label>
            <Textarea
              id="sg-lyrics"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Full lyrics — rendered as pre-formatted text on the public page."
              rows={8}
            />
          </div>
        </div>

        {/* Right column — meta */}
        <aside className="flex flex-col gap-6">
          <div className="sticky top-4 z-10 flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-[0_4px_18px_-8px_rgba(0,0,0,0.15)]">
            <Button
              type="submit"
              size="sm"
              loading={pending}
              disabled={pending}
              className="w-full"
              onClick={() => (intent.current = 'close')}
            >
              <Save className="h-3.5 w-3.5" />
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create song'}
            </Button>

            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={pending}
              className="w-full"
              onClick={() => (intent.current = 'again')}
            >
              <Plus className="h-3.5 w-3.5" />
              Save and add another
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

          <GroupSelect
            groups={groups}
            value={groupId}
            onChange={setGroupId}
            onManage={() => setManageOpen(true)}
          />

          <SongCoverPicker value={coverUrl} onChange={setCoverUrl} alt={title || 'Cover'} />
        </aside>
      </div>

      <GroupManagerDialog open={manageOpen} onOpenChange={setManageOpen} groups={groups} />

      <ConfirmDialog
        open={confirmDelete}
        title={editing ? `Delete "${editing.title}"?` : ''}
        description="Removes this song from the public Songs page."
        confirmLabel={pending ? 'Deleting…' : 'Delete'}
        onConfirm={runDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}
