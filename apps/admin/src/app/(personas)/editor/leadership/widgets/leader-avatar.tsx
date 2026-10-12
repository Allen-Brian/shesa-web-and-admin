'use client';

import Image from 'next/image';
import { UserRound } from 'lucide-react';

/**
 * Small square avatar used inside every leader row. Renders the photo
 * with next/image (unoptimised so the CMS bucket URL passes through
 * without needing a loader) or an icon fallback when photo_url is null.
 */
export function LeaderAvatar({
  photoUrl,
  size = 40,
  alt,
}: {
  readonly photoUrl: string | null;
  readonly size?: number;
  readonly alt: string;
}) {
  if (!photoUrl) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
        style={{ width: size, height: size }}
      >
        <UserRound className="h-1/2 w-1/2" />
      </div>
    );
  }
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-md bg-muted"
      style={{ width: size, height: size }}
    >
      <Image
        src={photoUrl}
        alt={alt}
        fill
        unoptimized
        className="object-cover"
        sizes={`${size}px`}
      />
    </div>
  );
}
