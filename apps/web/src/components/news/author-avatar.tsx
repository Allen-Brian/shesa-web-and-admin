'use client';

import Image from 'next/image';

import { isLocalSupabaseUrl } from '../leadership/is-local-supabase-url';
import type { Article } from './news-content';

/**
 * Circular author avatar. Renders the uploaded photo when present,
 * or a coloured badge with the author's initials (Google-style) when
 * the editor left the photo empty.
 */
export function AuthorAvatar({ article }: { readonly article: Article }) {
  const { name, photoUrl } = article.author;
  if (photoUrl) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
        <Image
          src={photoUrl}
          alt={name}
          fill
          sizes="40px"
          quality={75}
          unoptimized={isLocalSupabaseUrl(photoUrl)}
          className="object-cover object-top"
        />
      </div>
    );
  }
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 font-heading text-[13px] font-medium tracking-tight text-primary">
      {initials(name)}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
