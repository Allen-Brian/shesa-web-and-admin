'use client';

import Image from 'next/image';
import { Film } from 'lucide-react';

import type { MediaRow } from './gallery-widget-types';

interface Props {
  readonly item: MediaRow;
}

/**
 * Compact preview for a media grid cell. Photos render as an image;
 * videos render their poster (if any) with a small film-strip badge,
 * or a placeholder badge when no poster is set.
 */
export function MediaThumbnail({ item }: Props) {
  const poster = item.posterUrl ?? item.thumbnailUrl ?? null;

  if (item.kind === 'photo') {
    return (
      <Image
        src={item.src}
        alt={item.alt ?? ''}
        fill
        unoptimized
        sizes="240px"
        className="object-cover"
      />
    );
  }

  return (
    <>
      {poster ? (
        <Image
          src={poster}
          alt={item.alt ?? ''}
          fill
          unoptimized
          sizes="240px"
          className="object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-muted text-muted-foreground">
          <Film className="h-6 w-6" />
        </div>
      )}
      <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
        <Film className="h-3 w-3" />
        Video
      </span>
    </>
  );
}
