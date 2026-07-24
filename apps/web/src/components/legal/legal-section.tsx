'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

export interface LegalSectionData {
  readonly number: string;
  readonly heading: string;
  readonly paragraphs?: readonly string[];
  readonly bullets?: readonly string[];
  readonly note?: string;
  readonly children?: ReactNode;
}

/**
 * One numbered clause in a Terms/Privacy document. Renders heading,
 * an optional lede paragraph list, an optional bullet list, and an
 * optional "note" callout for things like inheritance-of-consent or
 * governing-law callouts that should stand out from body copy.
 */
export function LegalSection({
  number,
  heading,
  paragraphs,
  bullets,
  note,
  children,
}: LegalSectionData) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.75, ease }}
      className="scroll-mt-24"
      id={slugify(heading)}
    >
      <div className="flex items-baseline gap-4">
        <span className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary tabular-nums">
          {number}
        </span>
        <span aria-hidden className="h-px flex-1 bg-black/8" />
      </div>
      <h2
        className="mt-4 font-heading text-xl font-light text-black md:text-[1.5rem]"
        style={{ letterSpacing: '-0.015em' }}
      >
        {heading}
      </h2>

      {paragraphs?.length ? (
        <div className="mt-5 flex flex-col gap-4">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-[14.5px] leading-[1.85] text-black/70">
              {p}
            </p>
          ))}
        </div>
      ) : null}

      {bullets?.length ? (
        <ul className="mt-5 flex flex-col gap-2.5">
          {bullets.map((b, i) => (
            <li key={i} className="grid grid-cols-[16px_1fr] items-baseline gap-3">
              <span
                aria-hidden
                className="mt-1.5 h-1.5 w-1.5 rotate-45 bg-primary/70"
                style={{ marginLeft: 4 }}
              />
              <span className="text-[14px] leading-[1.75] text-black/70">{b}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {children}

      {note ? (
        <p className="mt-5 rounded-xs border border-primary/20 bg-primary/6 p-4 text-[13px] leading-[1.75] text-black/75">
          {note}
        </p>
      ) : null}
    </motion.article>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
