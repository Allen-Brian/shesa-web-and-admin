'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Save, Sparkles, Ticket, Trash2 } from 'lucide-react';

import { Button, Checkbox, ConfirmDialog, Input, Label, Textarea, toast } from '@shesa/ui';

import { QuillEditor } from '@/components/rich-editor/quill-editor';

import { createSiteEvent, deleteSiteEvent, updateSiteEvent } from '../actions/site-events';
import type { SiteEventInput } from '../actions/site-event-action-types';
import { SiteEventCategoryManagerDialog } from './site-event-category-manager-dialog';
import { TaxonomyPicker } from '@/components/taxonomy/taxonomy-picker';
import { EventBannerPicker } from './event-banner-picker';
import { FlyersEditor } from './flyers-editor';
import { ProgramEditor } from './program-editor';
import { slugify } from '@shesa/domain/utils';
import type { CategoryRow, ProgramItem, SiteEventRow } from './site-event-widget-types';

interface Props {
  readonly categories: readonly CategoryRow[];
  readonly editing?: SiteEventRow | null;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Full site-event form. Featured is a single-slot flag (server clears
 * the previous featured row on save); ticketing is opt-in (URL +
 * price + currency panel appears only when the box is checked); the
 * programme and flyers editors sit inline in the content column.
 */
export function SiteEventForm({ categories, editing }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(editing?.title ?? '');
  const [slug, setSlug] = useState(editing?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!editing);
  const [shortDescription, setShortDescription] = useState(editing?.shortDescription ?? '');
  const [bannerUrl, setBannerUrl] = useState(editing?.bannerUrl ?? '');
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(editing?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(editing?.endsAt ?? null));
  const [location, setLocation] = useState(editing?.location ?? '');
  const [city, setCity] = useState(editing?.city ?? '');
  const [isFeatured, setIsFeatured] = useState(editing?.isFeatured ?? false);

  const [hasTicketing, setHasTicketing] = useState(editing?.hasTicketing ?? false);
  const [ticketUrl, setTicketUrl] = useState(editing?.ticketUrl ?? '');
  const [ticketPrice, setTicketPrice] = useState(
    editing?.ticketPrice != null ? String(editing.ticketPrice) : '',
  );
  const [ticketCurrency, setTicketCurrency] = useState(editing?.ticketCurrency ?? 'XAF');

  const [flyers, setFlyers] = useState<readonly string[]>(editing?.flyers ?? []);
  const [program, setProgram] = useState<readonly ProgramItem[]>(editing?.program ?? []);
  const [albumSlug, setAlbumSlug] = useState(editing?.albumSlug ?? '');
  const [categoryIds, setCategoryIds] = useState<string[]>(editing ? [...editing.categoryIds] : []);
  const [manageOpen, setManageOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Which button was pressed. A ref rather than state: it is read
  // once inside the transition and must not trigger a render.
  const intent = useRef<'close' | 'again'>('close');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const descriptionHtml = String(fd.get('descriptionHtml') ?? '');

    if (!title.trim()) return toast.error('Title is required.');
    if (!slug.trim()) return toast.error('Slug is required.');
    if (!startsAt) return toast.error('Start date/time is required.');
    if (!descriptionHtml.trim() || descriptionHtml === '<p><br></p>') {
      return toast.error('Description is required.');
    }
    if (hasTicketing) {
      const price = Number.parseFloat(ticketPrice);
      if (!Number.isFinite(price) || price < 0) {
        return toast.error('Ticket price must be zero or more.');
      }
      if (!ticketCurrency.trim()) return toast.error('Ticket currency is required.');
    }

    const payload: SiteEventInput = {
      slug,
      title,
      shortDescription: shortDescription || null,
      descriptionHtml,
      bannerUrl: bannerUrl || null,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      location: location || null,
      city: city || null,
      isFeatured,
      hasTicketing,
      ticketUrl: hasTicketing ? ticketUrl || null : null,
      ticketPrice: hasTicketing ? Number.parseFloat(ticketPrice) || 0 : null,
      ticketCurrency: hasTicketing ? ticketCurrency : null,
      flyers,
      program: program.filter((p) => p.title.trim() || p.time.trim()),
      albumSlug: albumSlug || null,
      categoryIds,
    };

    startTransition(async () => {
      const res = editing
        ? await updateSiteEvent(editing.id, payload)
        : await createSiteEvent(payload);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(editing ? 'Event saved.' : 'Event created.');
      // "Save and add another" keeps the editor here; a plain save
      // returns to the list. Landing on the edit page of the thing
      // just saved, as this did, is neither of those.
      if (intent.current === 'again') {
        if (editing) {
          router.push('/editor/site-events/new');
          return;
        }
        resetForm();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      router.push('/editor/site-events');
    });
  };

  /** Back to a blank create form, ready for the next event. */
  const resetForm = () => {
    setTitle('');
    setSlug('');
    setSlugTouched(false);
    setShortDescription('');
    setBannerUrl('');
    setStartsAt('');
    setEndsAt('');
    setLocation('');
    setCity('');
    setIsFeatured(false);
    setCategoryIds([]);
    setHasTicketing(false);
    setTicketUrl('');
    setTicketPrice('');
    setAlbumSlug('');
    setFlyers([]);
    setProgram([]);
  };

  const runDelete = () => {
    if (!editing) return;
    startTransition(async () => {
      const res = await deleteSiteEvent(editing.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Event deleted.');
      router.push('/editor/site-events');
    });
  };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left column — main content */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-title">Title</Label>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="AGM 2026 · The Yaoundé Assembly"
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-slug">Slug</Label>
            <Input
              id="ev-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="agm-2026"
              maxLength={120}
            />
            <p className="text-[11px] text-muted-foreground">
              The public URL: /events/{slug || '…'}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-short">Short description</Label>
            <Textarea
              id="ev-short"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="One-sentence teaser shown in the events list."
              maxLength={500}
              rows={2}
            />
          </div>

          <EventBannerPicker value={bannerUrl} onChange={setBannerUrl} alt={title || 'Banner'} />

          <div className="flex flex-col gap-2">
            <Label>Description</Label>
            <QuillEditor
              name="descriptionHtml"
              initialValue={editing?.descriptionHtml ?? ''}
              placeholder="Tell the story of the event. Add photos with the image toolbar button."
              minHeight={320}
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/10 p-4">
            <ProgramEditor
              program={program}
              onChange={setProgram}
              /* datetime-local reads YYYY-MM-DDTHH:mm, so the date half
                 bounds the slot pickers to the event's own span. */
              dayRange={{
                min: startsAt ? startsAt.slice(0, 10) : undefined,
                max: endsAt ? endsAt.slice(0, 10) : undefined,
              }}
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/10 p-4">
            <FlyersEditor flyers={flyers} onChange={setFlyers} />
          </div>
        </div>

        {/* Right column — meta */}
        <aside className="flex flex-col gap-6">
          {/* Sticky action bar */}
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
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create event'}
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

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-starts">Start date &amp; time</Label>
              <Input
                id="ev-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-ends">End date &amp; time (optional)</Label>
              <Input
                id="ev-ends"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-location">Venue</Label>
              <Input
                id="ev-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Palais des Congrès"
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-city">City / region</Label>
              <Input
                id="ev-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Yaoundé, Cameroon"
                maxLength={200}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-md border border-border bg-card p-3">
            <Checkbox
              checked={isFeatured}
              onCheckedChange={(v) => setIsFeatured(v === true)}
              id="ev-featured"
            />
            <div className="flex flex-col leading-tight">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Featured
              </span>
              <span className="text-[11px] text-muted-foreground">
                Only one event at a time. Saving as featured clears the flag off any previously
                featured event.
              </span>
            </div>
          </label>

          <TaxonomyPicker
            label="Categories"
            rows={categories}
            selectedIds={categoryIds}
            onToggle={toggleCategory}
            onManage={() => setManageOpen(true)}
            emptyHint="No categories yet — open Manage to create some (Reunion, Ceremony, …)."
          />

          {/* Ticketing panel (opt-in) */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Checkbox
                checked={hasTicketing}
                onCheckedChange={(v) => setHasTicketing(v === true)}
              />
              <Ticket className="h-3.5 w-3.5 text-amber-600" />
              Ticketing
            </label>
            {hasTicketing && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ev-ticket-url">Ticket URL</Label>
                  <Input
                    id="ev-ticket-url"
                    value={ticketUrl}
                    onChange={(e) => setTicketUrl(e.target.value)}
                    placeholder="https://tickets.example.com/…"
                    maxLength={500}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ev-ticket-price">Price</Label>
                  <Input
                    id="ev-ticket-price"
                    type="number"
                    min="0"
                    step="1"
                    value={ticketPrice}
                    onChange={(e) => setTicketPrice(e.target.value)}
                    placeholder="15000"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ev-ticket-currency">Currency</Label>
                  <Input
                    id="ev-ticket-currency"
                    value={ticketCurrency}
                    onChange={(e) => setTicketCurrency(e.target.value.toUpperCase())}
                    placeholder="XAF"
                    maxLength={3}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-album">Gallery album slug (optional)</Label>
            <Input
              id="ev-album"
              value={albumSlug}
              onChange={(e) => setAlbumSlug(e.target.value)}
              placeholder="e.g. foundation-day-2023"
              maxLength={120}
            />
            <p className="text-[11px] text-muted-foreground">
              Links this event to a Gallery album on the public site.
            </p>
          </div>
        </aside>
      </div>

      <SiteEventCategoryManagerDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        categories={categories}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={editing ? `Delete "${editing.title}"?` : ''}
        description="The event will disappear from the public Events page immediately."
        confirmLabel={pending ? 'Deleting…' : 'Delete'}
        onConfirm={runDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}
