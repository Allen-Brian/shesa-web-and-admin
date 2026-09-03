'use client';

import { TaxonomyManagerDialog } from '@/components/taxonomy/taxonomy-manager-dialog';

import {
  createAlbumCategory,
  deleteAlbumCategory,
  updateAlbumCategory,
} from '../actions/album-categories';
import type { CategoryRow } from './gallery-widget-types';

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly categories: readonly CategoryRow[];
}

/** Compact CRUD for gallery album categories. */
export function AlbumCategoryManagerDialog({ open, onOpenChange, categories }: Props) {
  return (
    <TaxonomyManagerDialog
      open={open}
      onOpenChange={onOpenChange}
      rows={categories}
      noun="Category"
      title="Manage album categories"
      description="Tags used to classify albums on the public gallery. Deleting a category also unassigns it from every album."
      deleteDescription={() =>
        "Removes the category and unassigns it from every album. This can't be undone."
      }
      actions={{
        create: ({ name, sortOrder }) => createAlbumCategory({ name, sortOrder }),
        update: (id, { name }) => updateAlbumCategory(id, { name }),
        remove: deleteAlbumCategory,
      }}
    />
  );
}
