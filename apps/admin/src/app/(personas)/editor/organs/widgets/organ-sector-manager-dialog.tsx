'use client';

import { slugify } from '@shesa/domain/utils';

import { TaxonomyManagerDialog } from '@/components/taxonomy/taxonomy-manager-dialog';

import { createOrganSector, deleteOrganSector, updateOrganSector } from '../actions/organ-sectors';
import type { SectorRow } from './organ-widget-types';

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly sectors: readonly SectorRow[];
}

/**
 * Compact CRUD for organ sectors. The slug is derived from the name
 * rather than edited, so renaming a sector re-slugs it.
 */
export function OrganSectorManagerDialog({ open, onOpenChange, sectors }: Props) {
  return (
    <TaxonomyManagerDialog
      open={open}
      onOpenChange={onOpenChange}
      rows={sectors}
      noun="Sector"
      title="Manage sectors"
      description="Top-level groupings for organs (National (Cameroon), Europe, …). A sector can only be removed once every organ under it has been moved or deleted."
      deleteDescription={() => 'Removes the sector. Fails if any organ still points at it.'}
      actions={{
        create: ({ name, sortOrder }) =>
          createOrganSector({ name, slug: slugify(name), sortOrder }),
        update: (id, { name }) => updateOrganSector(id, { name, slug: slugify(name) }),
        remove: deleteOrganSector,
      }}
    />
  );
}
