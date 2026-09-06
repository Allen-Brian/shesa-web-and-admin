'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Save, Sparkles, Trash2 } from 'lucide-react';

import {
  Button,
  Checkbox,
  ConfirmDialog,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
  toast,
} from '@shesa/ui';

import { QuillEditor } from '@/components/rich-editor/quill-editor';

import { createProject, deleteProject, updateProject } from '../actions/projects';
import type { ProjectInput } from '../actions/project-action-types';
import { ProjectCategoryManagerDialog } from './project-category-manager-dialog';
import { TaxonomyPicker } from '@/components/taxonomy/taxonomy-picker';
import { ImpactEditor } from './impact-editor';
import { MilestonesEditor } from './milestones-editor';
import { ProjectBannerPicker } from './project-banner-picker';
import { slugify } from '@shesa/domain/utils';
import type {
  CategoryRow,
  ImpactStat,
  Milestone,
  ProjectRow,
  ProjectStatus,
} from './project-widget-types';

interface Props {
  readonly categories: readonly CategoryRow[];
  readonly editing?: ProjectRow | null;
}

/**
 * Full project form. Controlled React state for every field except
 * the rich description, which flows through Quill's hidden input and
 * is picked off the enclosing form on submit. Slug auto-derives from
 * the title while the operator hasn't touched it manually.
 *
 * Fundraising trio is opt-in — the operator toggles the panel, and
 * on save either all three land or all three are cleared.
 */
export function ProjectForm({ categories, editing }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(editing?.title ?? '');
  const [slug, setSlug] = useState(editing?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!editing);
  const [shortDescription, setShortDescription] = useState(editing?.shortDescription ?? '');
  const [bannerUrl, setBannerUrl] = useState(editing?.bannerUrl ?? '');
  const [status, setStatus] = useState<ProjectStatus>(editing?.status ?? 'Planning');
  const [startedOn, setStartedOn] = useState(editing?.startedOn ?? '');
  const [location, setLocation] = useState(editing?.location ?? '');
  const [lead, setLead] = useState(editing?.lead ?? '');
  const [isFeatured, setIsFeatured] = useState(editing?.isFeatured ?? false);

  const [hasFunding, setHasFunding] = useState(
    !!(editing && (editing.fundingRaised != null || editing.fundingTarget != null)),
  );
  const [fundingRaised, setFundingRaised] = useState(
    editing?.fundingRaised != null ? String(editing.fundingRaised) : '',
  );
  const [fundingTarget, setFundingTarget] = useState(
    editing?.fundingTarget != null ? String(editing.fundingTarget) : '',
  );
  const [fundingCurrency, setFundingCurrency] = useState(editing?.fundingCurrency ?? 'XAF');

  const [milestones, setMilestones] = useState<readonly Milestone[]>(editing?.milestones ?? []);
  const [impactStats, setImpactStats] = useState<readonly ImpactStat[]>(editing?.impactStats ?? []);
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
    if (!descriptionHtml.trim() || descriptionHtml === '<p><br></p>') {
      return toast.error('Description is required.');
    }

    if (hasFunding) {
      const raised = Number.parseFloat(fundingRaised);
      const target = Number.parseFloat(fundingTarget);
      if (!Number.isFinite(target) || target <= 0) {
        return toast.error('Fundraising target must be greater than zero.');
      }
      if (!Number.isFinite(raised) || raised < 0) {
        return toast.error('Fundraising raised must be zero or more.');
      }
      if (!fundingCurrency.trim()) return toast.error('Fundraising currency is required.');
    }

    const payload: ProjectInput = {
      slug,
      title,
      shortDescription: shortDescription || null,
      descriptionHtml,
      bannerUrl: bannerUrl || null,
      status,
      startedOn: startedOn || null,
      location: location || null,
      lead: lead || null,
      isFeatured,
      fundingRaised: hasFunding ? Number.parseFloat(fundingRaised) || 0 : null,
      fundingTarget: hasFunding ? Number.parseFloat(fundingTarget) || 0 : null,
      fundingCurrency: hasFunding ? fundingCurrency : null,
      milestones: milestones.filter((m) => m.title.trim() || m.date.trim()),
      impactStats: impactStats.filter((s) => s.value.trim() || s.label.trim()),
      categoryIds,
    };

    startTransition(async () => {
      const res = editing ? await updateProject(editing.id, payload) : await createProject(payload);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(editing ? 'Project saved.' : 'Project created.');
      // "Save and add another" keeps the editor here; a plain save
      // returns to the list. Landing on the edit page of the thing
      // just saved, as this did, is neither of those.
      if (intent.current === 'again') {
        if (editing) {
          router.push('/editor/projects/new');
          return;
        }
        resetForm();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      router.push('/editor/projects');
    });
  };

  /** Back to a blank create form, ready for the next project. */
  const resetForm = () => {
    setTitle('');
    setSlug('');
    setSlugTouched(false);
    setShortDescription('');
    setBannerUrl('');
    setStartedOn('');
    setLocation('');
    setLead('');
    setIsFeatured(false);
    setCategoryIds([]);
  };

  const runDelete = () => {
    if (!editing) return;
    startTransition(async () => {
      const res = await deleteProject(editing.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Project deleted.');
      router.push('/editor/projects');
    });
  };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left column — main content */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pr-title">Title</Label>
            <Input
              id="pr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="SHESA Endowment Fund"
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pr-slug">Slug</Label>
            <Input
              id="pr-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="endowment-fund"
              maxLength={120}
            />
            <p className="text-[11px] text-muted-foreground">
              The public URL: /projects/{slug || '…'}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pr-short">Short description</Label>
            <Textarea
              id="pr-short"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="One-sentence teaser shown on cards and the hero."
              maxLength={500}
              rows={2}
            />
          </div>

          <ProjectBannerPicker value={bannerUrl} onChange={setBannerUrl} alt={title || 'Banner'} />

          <div className="flex flex-col gap-2">
            <Label>Description</Label>
            <QuillEditor
              name="descriptionHtml"
              initialValue={editing?.descriptionHtml ?? ''}
              placeholder="Tell the story of the project. Add photos with the image toolbar button."
              minHeight={360}
            />
          </div>

          <Separator />

          <div className="rounded-lg border border-border bg-muted/10 p-4">
            <MilestonesEditor milestones={milestones} onChange={setMilestones} />
          </div>

          <div className="rounded-lg border border-border bg-muted/10 p-4">
            <ImpactEditor stats={impactStats} onChange={setImpactStats} />
          </div>
        </div>

        {/* Right column — publishing + metadata */}
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
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create project'}
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="pr-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
              <SelectTrigger id="pr-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Ongoing">Ongoing</SelectItem>
                <SelectItem value="Planning">Planning</SelectItem>
                <SelectItem value="Fundraising">Fundraising</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 rounded-md border border-border bg-card p-3">
            <Checkbox
              checked={isFeatured}
              onCheckedChange={(v) => setIsFeatured(v === true)}
              id="pr-featured"
            />
            <div className="flex flex-col leading-tight">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Featured
              </span>
              <span className="text-[11px] text-muted-foreground">
                Prioritises this project on the public Projects list.
              </span>
            </div>
          </label>

          <TaxonomyPicker
            label="Categories"
            rows={categories}
            selectedIds={categoryIds}
            onToggle={toggleCategory}
            onManage={() => setManageOpen(true)}
            emptyHint="No categories yet — open Manage to create some (Education, Health, …)."
          />

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pr-started">Started on</Label>
              <Input
                id="pr-started"
                value={startedOn}
                onChange={(e) => setStartedOn(e.target.value)}
                placeholder="e.g. January 2024"
                maxLength={80}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pr-location">Location</Label>
              <Input
                id="pr-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. National"
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pr-lead">Lead</Label>
              <Input
                id="pr-lead"
                value={lead}
                onChange={(e) => setLead(e.target.value)}
                placeholder="e.g. Mrs. Tanyi Bih, Treasurer"
                maxLength={200}
              />
            </div>
          </div>

          {/* Fundraising trio — opt-in panel */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Checkbox checked={hasFunding} onCheckedChange={(v) => setHasFunding(v === true)} />
              Track fundraising progress
            </label>
            {hasFunding && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pr-target">Target</Label>
                  <Input
                    id="pr-target"
                    type="number"
                    min="0"
                    step="1"
                    value={fundingTarget}
                    onChange={(e) => setFundingTarget(e.target.value)}
                    placeholder="500000000"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pr-raised">Raised so far</Label>
                  <Input
                    id="pr-raised"
                    type="number"
                    min="0"
                    step="1"
                    value={fundingRaised}
                    onChange={(e) => setFundingRaised(e.target.value)}
                    placeholder="178000000"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pr-currency">Currency</Label>
                  <Input
                    id="pr-currency"
                    value={fundingCurrency}
                    onChange={(e) => setFundingCurrency(e.target.value.toUpperCase())}
                    placeholder="XAF"
                    maxLength={3}
                  />
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <ProjectCategoryManagerDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        categories={categories}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={editing ? `Delete "${editing.title}"?` : ''}
        description="The project will disappear from the public Projects page immediately."
        confirmLabel={pending ? 'Deleting…' : 'Delete'}
        onConfirm={runDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}
