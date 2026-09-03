'use client';

import { TaxonomyManagerDialog } from '@/components/taxonomy/taxonomy-manager-dialog';

import { createSector, deleteSector, updateSector } from '../actions/sectors';
import type { SectorRow } from './leadership-widget-types';

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly sectors: readonly SectorRow[];
}

/**
 * Compact sectors CRUD launched from the Mainstream tab's toolbar.
 *
 * The only taxonomy here with a second field — a sector carries a
 * caption shown under its heading on the public slate. Delete cascades
 * to leaders, so the confirm dialog names the count inline.
 */
export function LeadershipSectorManagerDialog({ open, onOpenChange, sectors }: Props) {
  return (
    <TaxonomyManagerDialog
      open={open}
      onOpenChange={onOpenChange}
      rows={sectors}
      noun="Sector"
      nameMaxLength={100}
      captionOf={(sector) => sector.caption ?? ''}
      title="Manage sectors"
      description="Group headings for the mainstream slate: Executive, Council Portfolios, and so on. Deleting a sector also removes its leaders."
      deleteDescription={(sector) =>
        `Removes the sector and its ${sector.leaders.length} leader${
          sector.leaders.length === 1 ? '' : 's'
        }. This can't be undone.`
      }
      actions={{
        create: ({ name, caption, sortOrder }) => createSector({ name, caption, sortOrder }),
        update: (id, { name, caption }) => updateSector(id, { name, caption }),
        remove: deleteSector,
      }}
    />
  );
}
