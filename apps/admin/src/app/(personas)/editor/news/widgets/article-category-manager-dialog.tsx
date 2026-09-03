'use client';

import { TaxonomyManagerDialog } from '@/components/taxonomy/taxonomy-manager-dialog';

import {
  createArticleCategory,
  deleteArticleCategory,
  updateArticleCategory,
} from '../actions/article-categories';
import type { CategoryRow } from './news-widget-types';

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly categories: readonly CategoryRow[];
}

/** Compact CRUD for news article categories. */
export function ArticleCategoryManagerDialog({ open, onOpenChange, categories }: Props) {
  return (
    <TaxonomyManagerDialog
      open={open}
      onOpenChange={onOpenChange}
      rows={categories}
      noun="Category"
      title="Manage categories"
      description="Tags used to classify articles on the public News page. Deleting a category also unassigns it from every article."
      deleteDescription={() =>
        "Removes the category and unassigns it from every article. This can't be undone."
      }
      actions={{
        create: ({ name, sortOrder }) => createArticleCategory({ name, sortOrder }),
        update: (id, { name }) => updateArticleCategory(id, { name }),
        remove: deleteArticleCategory,
      }}
    />
  );
}
