'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';

import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from '@shesa/ui';

import {
  createArticleCategory,
  deleteArticleCategory,
  updateArticleCategory,
} from '../actions/article-categories';
import { CategoryRowCreator } from './category-row-creator';
import { CategoryRowEditor } from './category-row-editor';
import type { CategoryRow } from './types';

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly categories: readonly CategoryRow[];
}

/**
 * Compact article-category CRUD launched from the article form or
 * from a top-of-tab action. Same shape as the Leadership sectors
 * manager so the two admin surfaces feel unified. Delete cascades:
 * removing a category also strips its entries from every
 * article_categories_map row (via `ON DELETE CASCADE`).
 */
export function CategoryManagerDialog({ open, onOpenChange, categories }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<CategoryRow | null>(null);

  const nextSort = categories.length ? Math.max(...categories.map((c) => c.sortOrder)) + 10 : 10;

  const runSave = (id: string, name: string) => {
    if (!name.trim()) {
      toast.error('Category name is required.');
      return;
    }
    startTransition(async () => {
      const res = await updateArticleCategory(id, { name });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Category renamed.');
      router.refresh();
    });
  };

  const runCreate = (name: string, reset: () => void) => {
    if (!name.trim()) {
      toast.error('Category name is required.');
      return;
    }
    startTransition(async () => {
      const res = await createArticleCategory({ name, sortOrder: nextSort });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Category created.');
      reset();
      router.refresh();
    });
  };

  const runDelete = (category: CategoryRow) => {
    startTransition(async () => {
      const res = await deleteArticleCategory(category.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(`Category "${category.name}" removed.`);
      setConfirm(null);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Manage categories
          </DialogTitle>
          <DialogDescription>
            Tags used to classify articles on the public News page. Deleting a category also
            unassigns it from every article.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {categories.map((c) => (
            <CategoryRowEditor
              key={c.id}
              category={c}
              onSave={runSave}
              onDelete={() => setConfirm(c)}
              pending={pending}
            />
          ))}
          <CategoryRowCreator onCreate={runCreate} pending={pending} />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>

        <ConfirmDialog
          open={!!confirm}
          title={confirm ? `Delete "${confirm.name}"?` : ''}
          description="Removes the category and unassigns it from every article. This can't be undone."
          confirmLabel="Delete category"
          onConfirm={() => confirm && runDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      </DialogContent>
    </Dialog>
  );
}
