'use client';

import Image from 'next/image';

import type { Partner } from './partners-data';

interface Props {
  readonly partner: Partner;
  /** Tailwind sizing for the chip, e.g. `h-14 w-24 md:h-16 md:w-28`. */
  readonly className?: string;
  /** Font sizing for the wordmark fallback. */
  readonly textClassName?: string;
  /** Chip background. White reads like a printed logo panel. */
  readonly plate?: boolean;
}

/**
 * A partner's logo, shared by every strip variant. Renders real
 * artwork when a `logo` path is set and falls back to the brand
 * wordmark in the brand colour until those files exist.
 */
export function PartnerLogo({
  partner,
  className = 'h-14 w-24 md:h-16 md:w-28',
  textClassName = 'text-[13px] md:text-[15px]',
  plate = true,
}: Props) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-xs px-2 ${
        plate ? 'shadow-[0_2px_10px_rgba(0,0,0,0.25)]' : ''
      } ${className}`}
      /* MTN's current mark is monochrome and is meant to sit on the
         brand's yellow, so a partner can name the ground its logo needs;
         everyone else prints on white. */
      style={plate ? { backgroundColor: partner.plate ?? '#ffffff' } : undefined}
    >
      {partner.logo ? (
        /* `fill` + object-contain, so any aspect ratio is letterboxed and
           centred inside the chip. The previous `width`/`height` pair
           forced a 2:1 box on every mark, which pushed a square logo
           (CAMTEL's is 592x596) out of the bottom of its chip. */
        <Image
          src={partner.logo}
          alt={partner.name}
          fill
          sizes="256px"
          className="object-contain p-1.5"
        />
      ) : (
        <span
          className={`text-center font-heading font-semibold uppercase leading-none tracking-tight ${textClassName}`}
          style={{ color: plate ? partner.chip : 'currentColor' }}
        >
          {partner.name}
        </span>
      )}
    </span>
  );
}
