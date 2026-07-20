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
  createProjectCategory,
  deleteProjectCategory,
  updateProjectCategory,
} from '../actions/project-categories';
import { CategoryRowCreator } from './category-row-creator';
import { CategoryRowEditor } from './category-row-editor';
import type { CategoryRow } from './types';

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly categories: readonly CategoryRow[];
}

/** Compact CRUD for project categories — same shape as news + sectors. */
export function CategoryManagerDialog({ open, onOpenChange, categories }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<CategoryRow | null>(null);

  const nextSort = categories.length ? Math.max(...categories.map((c) => c.sortOrder)) + 10 : 10;

  const runSave = (id: string, name: string) => {
    if (!name.trim()) return toast.error('Category name is required.');
    startTransition(async () => {
      const res = await updateProjectCategory(id, { name });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Category renamed.');
      router.refresh();
    });
  };

  const runCreate = (name: string, reset: () => void) => {
    if (!name.trim()) return toast.error('Category name is required.');
    startTransition(async () => {
      const res = await createProjectCategory({ name, sortOrder: nextSort });
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
      const res = await deleteProjectCategory(category.id);
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
            Manage project categories
          </DialogTitle>
          <DialogDescription>
            Tags used to classify projects on the public site. Deleting a category also unassigns it
            from every project.
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
          description="Removes the category and unassigns it from every project. This can't be undone."
          confirmLabel="Delete category"
          onConfirm={() => confirm && runDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      </DialogContent>
    </Dialog>
  );
}
