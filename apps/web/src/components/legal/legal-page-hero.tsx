'use client';

import { motion, type Variants } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay: i * 0.1, ease },
  }),
};

interface Props {
  readonly eyebrow: string;
  readonly title: string;
  readonly summary: string;
  readonly effectiveDate: string;
  readonly version: string;
}

/**
 * Dark hero shared by the Terms and Privacy pages. Keeps the branding
 * consistent with the Strategic Plan hero so all "document"-shaped
 * pages read as one product family.
 */
export function LegalPageHero({ eyebrow, title, summary, effectiveDate, version }: Props) {
  return (
    <section
      data-nav-dark
      className="relative isolate overflow-hidden bg-black py-24 text-white md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(55% 65% at 50% 30%, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent"
      />

      <div className="relative mx-auto max-w-5xl px-5 md:px-8 lg:px-12">
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          variants={fadeUp}
          className="font-heading text-[11px] font-medium uppercase text-white/70"
          style={{ letterSpacing: '0.5em' }}
        >
          {eyebrow}
        </motion.p>

        <motion.h1
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={1}
          className="mt-8 font-heading font-thin leading-[1.05] text-white"
          style={{ fontSize: 'clamp(2.25rem, 5vw, 4.25rem)', letterSpacing: '-0.02em' }}
        >
          {title}
        </motion.h1>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={2}
          className="mt-8 max-w-2xl text-[15.5px] leading-[1.85] text-white/70"
        >
          {summary}
        </motion.p>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={3}
          className="mt-14 flex flex-wrap items-center gap-x-10 gap-y-6 border-t border-white/10 pt-8 text-white/70"
        >
          <MetaItem label="Effective" value={effectiveDate} />
          <MetaItem label="Version" value={version} />
          <MetaItem label="Jurisdiction" value="Republic of Cameroon" />
        </motion.div>
      </div>
    </section>
  );
}

function MetaItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p
        className="font-heading text-[10px] font-medium uppercase text-primary"
        style={{ letterSpacing: '0.32em' }}
      >
        {label}
      </p>
      <p className="mt-2 font-heading text-[15px] font-light text-white">{value}</p>
    </div>
  );
}
