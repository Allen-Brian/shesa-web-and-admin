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
  Textarea,
  toast,
} from '@shesa/ui';

import { QuillEditor } from '@/components/rich-editor/quill-editor';

import { createArticle, deleteArticle, updateArticle } from '../actions/articles';
import type { ArticleInput } from '../actions/news-action-types';
import { ArticleBannerPicker } from './article-banner-picker';
import { AuthorPhotoPicker } from './author-photo-picker';
import { ArticleCategoryManagerDialog } from './article-category-manager-dialog';
import { TaxonomyPicker } from '@/components/taxonomy/taxonomy-picker';
import { slugify } from '@shesa/domain/utils';
import type { ArticleRow, ArticleStatus, CategoryRow } from './news-widget-types';

interface Props {
  readonly categories: readonly CategoryRow[];
  readonly editing?: ArticleRow | null;
}

/**
 * Full article form used by both /editor/news/new and
 * /editor/news/[id]/edit. Controlled state for every field except the
 * rich content, which flows out through Quill's hidden input and is
 * read from the enclosing `<form>` on submit.
 *
 * Slug auto-derives from the title on create; can be edited by the
 * operator at any time.
 */
export function ArticleForm({ categories, editing }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(editing?.title ?? '');
  const [slug, setSlug] = useState(editing?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!editing);
  const [excerpt, setExcerpt] = useState(editing?.excerpt ?? '');
  const [bannerUrl, setBannerUrl] = useState(editing?.bannerUrl ?? '');
  const [authorName, setAuthorName] = useState(editing?.authorName ?? '');
  const [authorTitle, setAuthorTitle] = useState(editing?.authorTitle ?? '');
  const [authorPhotoUrl, setAuthorPhotoUrl] = useState(editing?.authorPhotoUrl ?? '');
  const [status, setStatus] = useState<ArticleStatus>(editing?.status ?? 'draft');
  const [publishAt, setPublishAt] = useState(
    editing?.publishAt ? editing.publishAt.slice(0, 16) : '',
  );
  const [isFeatured, setIsFeatured] = useState(editing?.isFeatured ?? false);
  const [categoryIds, setCategoryIds] = useState<string[]>(editing ? [...editing.categoryIds] : []);
  const [manageOpen, setManageOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Auto-slug from title while the operator hasn't touched it.
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Which button was pressed. A ref rather than state: it is read
  // once inside the transition and must not trigger a render.
  const intent = useRef<'close' | 'again'>('close');

  // Bumped to remount the rich editor: its content lives inside Quill,
  // not in React state, so there is no setter to clear it with.
  const [editorKey, setEditorKey] = useState(0);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const contentHtml = String(fd.get('contentHtml') ?? '');

    if (!title.trim()) return toast.error('Title is required.');
    if (!slug.trim()) return toast.error('Slug is required.');
    if (!authorName.trim()) return toast.error('Author name is required.');
    if (!contentHtml.trim() || contentHtml === '<p><br></p>') {
      return toast.error('Content is required.');
    }
    if (status === 'scheduled' && !publishAt) {
      return toast.error('Scheduled articles need a publish date.');
    }

    const payload: ArticleInput = {
      slug,
      title,
      excerpt: excerpt || null,
      contentHtml,
      bannerUrl: bannerUrl || null,
      authorName,
      authorTitle: authorTitle || null,
      authorPhotoUrl: authorPhotoUrl || null,
      status,
      publishAt: publishAt ? new Date(publishAt).toISOString() : null,
      isFeatured,
      categoryIds,
    };

    startTransition(async () => {
      const res = editing ? await updateArticle(editing.id, payload) : await createArticle(payload);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(editing ? 'Article saved.' : 'Article created.');
      // "Save and add another" keeps the editor here; a plain save
      // returns to the list. Landing on the edit page of the thing
      // just saved, as this did, is neither of those.
      if (intent.current === 'again') {
        if (editing) {
          router.push('/editor/news/new');
          return;
        }
        resetForm();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      router.push('/editor/news');
    });
  };

  /** Back to a blank create form, ready for the next article. */
  const resetForm = () => {
    setTitle('');
    setSlug('');
    setSlugTouched(false);
    setExcerpt('');
    setBannerUrl('');
    setEditorKey((n) => n + 1);
    setCategoryIds([]);
    setIsFeatured(false);
  };

  const runDelete = () => {
    if (!editing) return;
    startTransition(async () => {
      const res = await deleteArticle(editing.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Article deleted.');
      router.push('/editor/news');
    });
  };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left column — main content */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="art-title">Title</Label>
            <Input
              id="art-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="AGM 2026: All roads lead to Palais des Congrès, Yaoundé"
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="art-slug">Slug</Label>
            <Input
              id="art-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="agm-2026-yaounde"
              maxLength={120}
            />
            <p className="text-[11px] text-muted-foreground">The public URL: /news/{slug || '…'}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="art-excerpt">Excerpt</Label>
            <Textarea
              id="art-excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="One-sentence teaser shown in the article list."
              maxLength={500}
              rows={2}
            />
          </div>

          <ArticleBannerPicker value={bannerUrl} onChange={setBannerUrl} alt={title || 'Banner'} />

          <div className="flex flex-col gap-2">
            <Label>Content</Label>
            <QuillEditor
              key={editorKey}
              name="contentHtml"
              initialValue={editing?.contentHtml ?? ''}
              placeholder="Write the article. Use the toolbar's image button to embed pictures."
              minHeight={360}
            />
          </div>
        </div>

        {/* Right column — publishing controls */}
        <aside className="flex flex-col gap-6">
          {/* Sticky action bar — always visible while the operator scrolls. */}
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
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create article'}
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
            <Label htmlFor="art-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ArticleStatus)}>
              <SelectTrigger id="art-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="art-publish">
              {status === 'scheduled' ? 'Publish at' : 'Publish date'}
            </Label>
            <Input
              id="art-publish"
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Used as the article&apos;s date on the public site. Leave blank to use the created
              time.
            </p>
          </div>

          <label className="flex items-center gap-2 rounded-md border border-border bg-card p-3">
            <Checkbox
              checked={isFeatured}
              onCheckedChange={(v) => setIsFeatured(v === true)}
              id="art-featured"
            />
            <div className="flex flex-col leading-tight">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Featured
              </span>
              <span className="text-[11px] text-muted-foreground">
                Surfaces in the hero carousel on the public News page.
              </span>
            </div>
          </label>

          <TaxonomyPicker
            label="Categories"
            rows={categories}
            selectedIds={categoryIds}
            onToggle={toggleCategory}
            onManage={() => setManageOpen(true)}
            emptyHint="No categories yet — open Manage to create some (e.g. News, Announcement)."
          />

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="art-author-name">Author</Label>
              <Input
                id="art-author-name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. The National Secretariat"
                maxLength={200}
              />
              <Input
                value={authorTitle}
                onChange={(e) => setAuthorTitle(e.target.value)}
                placeholder="Role / desk (optional)"
                maxLength={200}
                className="text-xs"
              />
            </div>
            <AuthorPhotoPicker
              value={authorPhotoUrl}
              onChange={setAuthorPhotoUrl}
              alt={authorName || 'Author'}
            />
          </div>
        </aside>
      </div>

      <ArticleCategoryManagerDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        categories={categories}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={editing ? `Delete "${editing.title}"?` : ''}
        description="The article will disappear from the public News page immediately."
        confirmLabel={pending ? 'Deleting…' : 'Delete'}
        onConfirm={runDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}
