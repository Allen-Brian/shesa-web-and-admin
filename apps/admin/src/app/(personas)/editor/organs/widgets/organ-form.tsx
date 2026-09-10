'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Trash2 } from 'lucide-react';

import { Button, ConfirmDialog, Input, Label, Textarea, toast } from '@shesa/ui';

import { createOrgan, deleteOrgan, setOrganAlbum, updateOrgan } from '../actions/organs';
import type { OrganInput } from '../actions/organ-action-types';
import { AlbumLinker } from './album-linker';
import { OrganLogoPicker } from './organ-logo-picker';
import { OrganSectorManagerDialog } from './organ-sector-manager-dialog';
import { SectorSelect } from './sector-select';
import { slugify } from '@shesa/domain/utils';
import type { LinkableAlbum } from '../load-organs';
import type { OrganRow, SectorRow } from './organ-widget-types';

interface Props {
  readonly sectors: readonly SectorRow[];
  readonly editing?: OrganRow | null;
  readonly albums: readonly LinkableAlbum[];
}

/**
 * Organ form — name + sector + member count + optional location /
 * founded year / description / achievements / album / logo / contact
 * fields. Slug follows the name until the editor edits it directly.
 */
export function OrganForm({ sectors, editing, albums }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(editing?.name ?? '');
  const [slug, setSlug] = useState(editing?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!editing);
  const [shortName, setShortName] = useState(editing?.shortName ?? '');
  const [sectorId, setSectorId] = useState<string>(editing?.sectorId ?? sectors[0]?.id ?? '');
  const [location, setLocation] = useState(editing?.location ?? '');
  const [country, setCountry] = useState(editing?.country ?? '');
  const [foundedYear, setFoundedYear] = useState(
    editing?.foundedYear != null ? String(editing.foundedYear) : '',
  );
  const [memberCount, setMemberCount] = useState(String(editing?.memberCount ?? 0));
  const [description, setDescription] = useState(editing?.description ?? '');
  const [logoUrl, setLogoUrl] = useState(editing?.logoUrl ?? '');
  const [contactEmail, setContactEmail] = useState(editing?.contactEmail ?? '');
  const [contactPhone, setContactPhone] = useState(editing?.contactPhone ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(editing?.websiteUrl ?? '');

  /**
   * Always three boxes, whatever is stored.
   *
   * The Highlight Series asks each branch for its top three, so the form
   * shows three rather than an add/remove list — the shape of the ask is
   * the shape of the form, and an editor should not have to discover a
   * button to answer it. Blanks are dropped on save, and an organ that
   * already has more than three keeps them all.
   */
  const [achievements, setAchievements] = useState<string[]>(() => {
    const stored = [...(editing?.achievements ?? [])];
    while (stored.length < 3) stored.push('');
    return stored;
  });
  /**
   * Which album points at this organ.
   *
   * Read from the albums rather than from the organ, because the link
   * lives on `gallery_albums.linked_organ_id` — there is no column on
   * the organ to read it from, and duplicating one would be a second
   * source of truth for a fact the album already states.
   */
  const [albumId, setAlbumId] = useState<string | null>(
    () => albums.find((a) => a.linkedOrganId === editing?.id)?.id ?? null,
  );

  const [manageOpen, setManageOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (!slug.trim()) {
      toast.error('Slug is required.');
      return;
    }
    if (!sectorId) {
      toast.error('Pick a sector.');
      return;
    }
    const members = Number.parseInt(memberCount, 10);
    if (!Number.isFinite(members) || members < 0) {
      toast.error('Member count must be zero or a positive integer.');
      return;
    }
    const year = foundedYear ? Number.parseInt(foundedYear, 10) : null;
    if (foundedYear && (!Number.isFinite(year) || year! < 1800 || year! > 2100)) {
      toast.error('Founded year looks off — use a plain 4-digit year.');
      return;
    }

    const payload: OrganInput = {
      sectorId,
      slug,
      name,
      shortName: shortName || null,
      location: location || null,
      country: country || null,
      foundedYear: year,
      memberCount: members,
      description: description || null,
      achievements,
      logoUrl: logoUrl || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      websiteUrl: websiteUrl || null,
      sortOrder: editing?.sortOrder ?? 999,
    };

    startTransition(async () => {
      const res = editing ? await updateOrgan(editing.id, payload) : await createOrgan(payload);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }

      const newId = editing ? editing.id : (res.data as { id: string })?.id;

      // Separate write, because the link is a column on the album. Only
      // sent when it actually changed — otherwise saving an unrelated
      // field would clear and rewrite the link on every submit.
      const wasLinked = albums.find((a) => a.linkedOrganId === editing?.id)?.id ?? null;
      if (newId && albumId !== wasLinked) {
        const linkRes = await setOrganAlbum(newId, albumId);
        if (!linkRes.ok) {
          // The organ itself saved, so say what did and did not land
          // rather than reporting one failure for both.
          toast.error(`Organ saved, but the album link failed: ${linkRes.message}`);
          router.push(`/editor/organs/${newId}/edit`);
          return;
        }
      }

      toast.success(editing ? 'Organ saved.' : 'Organ created.');
      router.push(newId ? `/editor/organs/${newId}/edit` : '/editor/organs');
    });
  };

  const runDelete = () => {
    if (!editing) return;
    startTransition(async () => {
      const res = await deleteOrgan(editing.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Organ deleted.');
      router.push('/editor/organs');
    });
  };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left column — main content */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="or-name">Name</Label>
            <Input
              id="or-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bamenda Branch"
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="or-short">Short name (optional)</Label>
              <Input
                id="or-short"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="Bamenda"
                maxLength={80}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="or-slug">Slug</Label>
              <Input
                id="or-slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                placeholder="branch-bamenda"
                maxLength={120}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="or-location">City / location</Label>
              <Input
                id="or-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Bamenda"
                maxLength={120}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="or-country">Country</Label>
              <Input
                id="or-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Cameroon"
                maxLength={120}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="or-founded">Founded year</Label>
              <Input
                id="or-founded"
                type="number"
                min="1800"
                max="2100"
                value={foundedYear}
                onChange={(e) => setFoundedYear(e.target.value)}
                placeholder="2001"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="or-members">Member count</Label>
              <Input
                id="or-members"
                type="number"
                min="0"
                step="1"
                value={memberCount}
                onChange={(e) => setMemberCount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="or-description">Description</Label>
            <Textarea
              id="or-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One or two sentences describing what this organ does."
              maxLength={800}
              rows={4}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="or-ach-0">Achievements</Label>
            <p className="text-xs text-muted-foreground">
              The branch&apos;s top achievements, shown in order on its public page. Leave any blank
              to skip it.
            </p>
            <div className="flex flex-col gap-2">
              {achievements.map((value, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-6 shrink-0 pt-2.5 text-xs tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Textarea
                    id={`or-ach-${i}`}
                    value={value}
                    onChange={(e) =>
                      setAchievements((prev) =>
                        prev.map((entry, j) => (j === i ? e.target.value : entry)),
                      )
                    }
                    placeholder={
                      i === 0 ? 'e.g. Raised 4.2M XAF for the school library refurbishment.' : ''
                    }
                    maxLength={500}
                    rows={2}
                  />
                </div>
              ))}
            </div>
            {achievements.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => setAchievements((prev) => [...prev, ''])}
              >
                Add another
              </Button>
            )}
          </div>

          {/* The mirror of the organ picker on the album form — both
              write `gallery_albums.linked_organ_id`, so the relationship
              can be set from whichever screen the editor is already on. */}
          <AlbumLinker albums={albums} value={albumId} onChange={setAlbumId} />

          <OrganLogoPicker value={logoUrl} onChange={setLogoUrl} alt={name || 'Logo'} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="or-email">Contact email</Label>
              <Input
                id="or-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="branch@shesaconnect.com"
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="or-phone">Contact phone</Label>
              <Input
                id="or-phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+237 6xx xxx xxx"
                maxLength={80}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="or-web">Website (optional)</Label>
            <Input
              id="or-web"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://…"
              maxLength={300}
            />
          </div>
        </div>

        {/* Right column — meta */}
        <aside className="flex flex-col gap-6">
          <div className="sticky top-4 z-10 flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-[0_4px_18px_-8px_rgba(0,0,0,0.15)]">
            <Button type="submit" size="sm" loading={pending} disabled={pending} className="w-full">
              <Save className="h-3.5 w-3.5" />
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create organ'}
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

          <SectorSelect
            sectors={sectors}
            value={sectorId}
            onChange={setSectorId}
            onManage={() => setManageOpen(true)}
          />
        </aside>
      </div>

      <OrganSectorManagerDialog open={manageOpen} onOpenChange={setManageOpen} sectors={sectors} />

      <ConfirmDialog
        open={confirmDelete}
        title={editing ? `Delete "${editing.name}"?` : ''}
        description="Removes this organ from the public Organs page."
        confirmLabel={pending ? 'Deleting…' : 'Delete'}
        onConfirm={runDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}
