'use client';

import Image from 'next/image';

/**
 * A song's cover art, or the crest on the brand colour when the CMS has
 * none.
 *
 * The fallback used to be the title's first two letters, which produced
 * squares reading "TH" and "SH" down the page and said nothing about
 * whose music it was. The crest at least identifies the association.
 */
export function SongCover({
  src,
  title,
  sizes = '(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 50vw',
  className,
  priority = false,
}: {
  readonly src: string | null;
  readonly title: string;
  readonly sizes?: string;
  readonly className?: string;
  readonly priority?: boolean;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={title}
        fill
        sizes={sizes}
        quality={70}
        priority={priority}
        className={className ?? 'object-cover object-top transition-transform duration-1000'}
      />
    );
  }

  return (
    <div
      className="grid h-full w-full place-items-center"
      style={{
        background:
          'radial-gradient(70% 70% at 50% 35%, color-mix(in srgb, var(--color-primary) 92%, white) 0%, var(--color-primary) 55%, color-mix(in srgb, var(--color-primary) 70%, black) 100%)',
      }}
    >
      <Image
        src="/shesa.png"
        alt=""
        width={220}
        height={220}
        className="h-[46%] w-auto object-contain opacity-95"
      />
    </div>
  );
}
