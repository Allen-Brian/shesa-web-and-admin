'use client';

import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay: i * 0.08, ease },
  }),
};

interface SectionShellProps {
  readonly id: string;
  readonly number: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly lede?: string;
  readonly tone?: 'light' | 'tint';
  readonly children: ReactNode;
}

/**
 * A consistent chrome for every top-level Strategic Plan section:
 * the numbered eyebrow, the h2, an optional lede, and a scroll
 * anchor. The `tone` prop lets alternating sections take a subtle
 * primary tint without every section carrying its own gradient
 * boilerplate.
 */
export function SectionShell({
  id,
  number,
  eyebrow,
  title,
  lede,
  tone = 'light',
  children,
}: SectionShellProps) {
  const bg =
    tone === 'tint'
      ? 'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 3%, white) 0%, color-mix(in srgb, var(--color-primary) 5%, white) 100%)'
      : 'white';
  return (
    <section id={id} className="relative py-20 text-black md:py-28" style={{ background: bg }}>
      <div className="mx-auto max-w-6xl px-5 md:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          className="flex items-baseline gap-3"
        >
          <span className="font-heading text-[11px] font-medium uppercase tracking-[0.32em] text-primary">
            {number} · {eyebrow}
          </span>
        </motion.div>

        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={1}
          className="mt-5 max-w-3xl font-heading font-thin leading-[1.1] text-black"
          style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)', letterSpacing: '-0.02em' }}
        >
          {title}
        </motion.h2>

        {lede && (
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={2}
            className="mt-5 max-w-3xl text-[15.5px] leading-[1.8] text-black/65"
          >
            {lede}
          </motion.p>
        )}

        <div className="mt-12 md:mt-14">{children}</div>
      </div>
    </section>
  );
}
