'use client';

import { TaxonomyManagerDialog } from '@/components/taxonomy/taxonomy-manager-dialog';

import {
  createEventCategory,
  deleteEventCategory,
  updateEventCategory,
} from '../actions/site-event-categories';
import type { CategoryRow } from './site-event-widget-types';

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly categories: readonly CategoryRow[];
}

/** Compact CRUD for public site event categories. */
export function SiteEventCategoryManagerDialog({ open, onOpenChange, categories }: Props) {
  return (
    <TaxonomyManagerDialog
      open={open}
      onOpenChange={onOpenChange}
      rows={categories}
      noun="Category"
      title="Manage event categories"
      description="Tags used to classify events on the public site. Deleting a category also unassigns it from every event."
      deleteDescription={() =>
        "Removes the category and unassigns it from every event. This can't be undone."
      }
      actions={{
        create: ({ name, sortOrder }) => createEventCategory({ name, sortOrder }),
        update: (id, { name }) => updateEventCategory(id, { name }),
        remove: deleteEventCategory,
      }}
    />
  );
}
