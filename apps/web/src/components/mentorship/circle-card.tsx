'use client';

import { motion, type Variants } from 'framer-motion';
import { Briefcase, Cpu, Megaphone, Scale, Stethoscope, type LucideIcon } from 'lucide-react';

import type { MentorshipCircle } from './mentorship-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.08, ease },
  }),
};

const ICONS: Record<MentorshipCircle['icon'], LucideIcon> = {
  briefcase: Briefcase,
  stethoscope: Stethoscope,
  cpu: Cpu,
  scale: Scale,
  megaphone: Megaphone,
};

export function CircleCard({
  circle,
  index,
}: {
  readonly circle: MentorshipCircle;
  readonly index: number;
}) {
  const Icon = ICONS[circle.icon];

  return (
    <motion.article
      id={circle.slug}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={fadeUp}
      custom={index}
      className="flex scroll-mt-28 flex-col rounded-lg border border-black/10 bg-white p-6 transition-colors duration-300 hover:border-primary/40 md:p-7"
    >
      <span
        aria-hidden
        className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary"
      >
        <Icon className="h-5 w-5" strokeWidth={1.6} />
      </span>

      <p className="mt-5 font-heading text-[11px] font-semibold uppercase tracking-[0.26em] text-primary">
        {circle.field}
      </p>
      <h3
        className="mt-2 font-heading font-light leading-tight text-black"
        style={{ fontSize: 'clamp(1.35rem, 2.6vw, 1.75rem)' }}
      >
        {circle.name}
      </h3>

      <p className="mt-3 text-[14.5px] leading-[1.7] text-black/60">{circle.blurb}</p>

      {/* The deciding information. Somebody scanning four cards wants to
          recognise themselves in one of them, not read four paragraphs. */}
      <ul className="mt-5 flex flex-1 flex-col gap-2">
        {circle.forYouIf.map((line) => (
          <li
            key={line}
            className="flex items-start gap-2.5 text-[13.5px] leading-snug text-black/70"
          >
            <span aria-hidden className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-primary" />
            {line}
          </li>
        ))}
      </ul>

      {/* Pushed to the bottom by the `flex-1` spacer above, so every
          button in the row lands on the same line even when the cards
          hold different amounts of text. */}
      <a
        href={circle.invite}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3.5 font-heading text-[12px] font-semibold uppercase tracking-[0.2em] text-white transition-colors duration-300 hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <WhatsAppMark />
        Join {circle.name}
      </a>
    </motion.article>
  );
}

/**
 * The WhatsApp glyph.
 *
 * Inline rather than from `lucide-react`, which has no brand icons, and
 * inline rather than an image so it takes `currentColor` and inverts
 * with the button on hover.
 */
function WhatsAppMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-current" focusable="false">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.57-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.19 4.23-9.41 9.42-9.41a9.36 9.36 0 0 1 9.41 9.42c0 5.19-4.23 9.41-9.42 9.41zM20.05 3.94A11.3 11.3 0 0 0 12.04 .62C5.8.62.73 5.69.73 11.93c0 1.99.52 3.94 1.51 5.65L.64 23.38l5.94-1.56a11.29 11.29 0 0 0 5.45 1.39h.01c6.23 0 11.3-5.07 11.3-11.31a11.25 11.25 0 0 0-3.3-7.96z" />
    </svg>
  );
}
