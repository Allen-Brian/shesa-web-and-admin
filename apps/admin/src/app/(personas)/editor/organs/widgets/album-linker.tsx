'use client';

import { Images } from 'lucide-react';

import { EntityLinker } from '@/components/linkers/entity-linker';

import type { LinkableAlbum } from '../load-organs';

/**
 * The organ's half of the album link.
 *
 * The album form has the mirror of this. Both write the same column —
 * `gallery_albums.linked_organ_id` — so an editor can set the
 * relationship from whichever screen they are already on, which is the
 * point: nobody wants to leave a branch they are editing to go and find
 * its album.
 */
export function AlbumLinker({
  albums,
  value,
  onChange,
}: {
  readonly albums: readonly LinkableAlbum[];
  readonly value: string | null;
  readonly onChange: (nextAlbumId: string | null) => void;
}) {
  return (
    <EntityLinker
      title="Linked album"
      icon={Images}
      value={value}
      onChange={onChange}
      placeholder="No album linked"
      searchPlaceholder="Search albums…"
      emptyText="No albums found."
      help="The linked album’s photos appear on this organ’s public page."
      options={albums.map((a) => ({
        id: a.id,
        label: a.title,
        // Flags albums already spoken for, so an editor does not silently
        // steal one from another branch.
        hint: [
          a.dateLabel,
          a.linkedOrganId && a.linkedOrganId !== value ? 'linked elsewhere' : null,
        ]
          .filter(Boolean)
          .join(' · '),
        search: a.slug,
      }))}
    />
  );
}
