'use client';

import { TaxonomyManagerDialog } from '@/components/taxonomy/taxonomy-manager-dialog';

import {
  createProjectCategory,
  deleteProjectCategory,
  updateProjectCategory,
} from '../actions/project-categories';
import type { CategoryRow } from './project-widget-types';

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly categories: readonly CategoryRow[];
}

/** Compact CRUD for project categories. */
export function ProjectCategoryManagerDialog({ open, onOpenChange, categories }: Props) {
  return (
    <TaxonomyManagerDialog
      open={open}
      onOpenChange={onOpenChange}
      rows={categories}
      noun="Category"
      title="Manage project categories"
      description="Tags used to classify projects on the public site. Deleting a category also unassigns it from every project."
      deleteDescription={() =>
        "Removes the category and unassigns it from every project. This can't be undone."
      }
      actions={{
        create: ({ name, sortOrder }) => createProjectCategory({ name, sortOrder }),
        update: (id, { name }) => updateProjectCategory(id, { name }),
        remove: deleteProjectCategory,
      }}
    />
  );
}
